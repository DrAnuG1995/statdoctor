import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ComposedChart } from "recharts";
import { Stethoscope, Building2, Handshake, CalendarClock, CheckCircle2, Percent, DollarSign } from "lucide-react";

// Parse "Registered: DD Mon YYYY" from doctor notes to get actual app registration date
function parseRegisteredDate(notes: string | null): Date | null {
  if (!notes) return null;
  const match = notes.match(/Registered:\s*(.+)/);
  if (!match) return null;
  const parsed = new Date(match[1]);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function useMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    refetchInterval: 30_000, // Auto-refresh every 30s for live numbers
    staleTime: 15_000,
    queryFn: async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [doctors, hospitals, deals, investors, hospitalsThisMonth, hospitalsLastMonth, dealsThisMonth, dealsLastMonth, pipelineStages, dealsWithStages, shiftsTotal, shiftsConfirmed, shiftsArchived, shiftsCancelled, shiftsActive, doctorsThisMonthQ, doctorsLastMonthQ] = await Promise.all([
        supabase.from("doctors").select("status, notes, registered_date"),
        supabase.from("hospitals").select("status"),
        supabase.from("hospital_deals").select("value, name, notes, stage_id"),
        supabase.from("investors").select("status"),
        supabase.from("hospitals").select("id").gte("created_at", thisMonthStart.toISOString()),
        supabase.from("hospitals").select("id").gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString()),
        supabase.from("hospital_deals").select("value").gte("created_at", thisMonthStart.toISOString()),
        supabase.from("hospital_deals").select("value").gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString()),
        supabase.from("hospital_pipeline_stages").select("id, name"),
        supabase.from("hospital_deals").select("stage_id"),
        supabase.from("shifts").select("*", { count: "exact", head: true }),
        supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "Confirmed"),
        supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "Archived"),
        supabase.from("shifts").select("*", { count: "exact", head: true }).or("status.eq.Cancelled Doctor,status.eq.Cancelled Hospital"),
        supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "Active"),
        // Live count: doctors registered this month (using registered_date column first, fallback to notes)
        supabase.from("doctors").select("*", { count: "exact", head: true }).gte("registered_date", thisMonthStart.toISOString()),
        supabase.from("doctors").select("*", { count: "exact", head: true }).gte("registered_date", lastMonthStart.toISOString()).lte("registered_date", lastMonthEnd.toISOString()),
      ]);

      const doctorData = doctors.data || [];
      const hospitalData = hospitals.data || [];
      const dealData = deals.data || [];
      const investorData = investors.data || [];

      // Live count from registered_date column; supplement with notes-based parsing for doctors missing registered_date
      let doctorsThisMonthCount = doctorsThisMonthQ.count || 0;
      let doctorsLastMonthCount = doctorsLastMonthQ.count || 0;
      for (const doc of doctorData) {
        if (doc.registered_date) continue; // already counted by the direct query
        const regDate = parseRegisteredDate(doc.notes);
        if (!regDate) continue;
        if (regDate >= thisMonthStart) doctorsThisMonthCount++;
        else if (regDate >= lastMonthStart && regDate <= lastMonthEnd) doctorsLastMonthCount++;
      }

      const hospitalsLast30 = hospitalsThisMonth.data?.length || 0;
      const hospitalsLastCount = hospitalsLastMonth.data?.length || 0;

      const revenueThis = (dealsThisMonth.data || []).reduce((s, d) => s + Number(d.value || 0), 0);
      const revenueLast = (dealsLastMonth.data || []).reduce((s, d) => s + Number(d.value || 0), 0);

      const totalDoctors = doctorData.length;
      const totalHospitals = hospitalData.length;

      // Count hospitals by pipeline stage (closed = accounts, rest = pipeline)
      const stages = pipelineStages.data || [];
      const allDealsWithStages = dealsWithStages.data || [];
      const closedStageIds = new Set(
        stages.filter((s) => {
          const n = s.name.toLowerCase();
          return (n.includes("closed") && !n.includes("lost")) || n.includes("won") || n.includes("pay per shift");
        }).map((s) => s.id),
      );
      const lostStageIds = new Set(
        stages.filter((s) => s.name.toLowerCase().includes("lost")).map((s) => s.id),
      );
      const hospitalAccounts = allDealsWithStages.filter((d) => closedStageIds.has(d.stage_id)).length;
      const hospitalsPipeline = allDealsWithStages.filter(
        (d) => !closedStageIds.has(d.stage_id) && !lostStageIds.has(d.stage_id),
      ).length;

      // Revenue vs Pipeline split
      const SHIFT_DEAL_PREFIX = "Shift Revenue";
      let subscriptionRevenue = 0;
      let shiftRevenue = 0;
      let totalShiftCount = 0;
      let openPipelineValue = 0;

      for (const d of dealData) {
        const isShiftDeal = (d as any).name?.startsWith(SHIFT_DEAL_PREFIX);
        const isClosed = closedStageIds.has((d as any).stage_id);
        const isLost = lostStageIds.has((d as any).stage_id);

        if (isShiftDeal) {
          // Parse shift revenue from notes
          const notes = (d as any).notes || "";
          const sm = notes.match(/shifts:(\d+)/);
          const rm = notes.match(/rate:(\d+)/);
          const shifts = sm ? parseInt(sm[1]) : 0;
          const rate = rm ? parseInt(rm[1]) : 99;
          shiftRevenue += shifts * rate;
          totalShiftCount += shifts;
        } else if (isClosed) {
          subscriptionRevenue += Number(d.value || 0);
        } else if (!isLost) {
          openPipelineValue += Number(d.value || 0);
        }
      }
      const totalRevenue = subscriptionRevenue + shiftRevenue;

      // Shift metrics using exact counts (avoids Supabase 1000 row limit)
      const totalShiftsCount = shiftsTotal.count || 0;
      const confirmedShiftsCount = shiftsConfirmed.count || 0;
      const archivedShiftsCount = shiftsArchived.count || 0;
      const cancelledShiftsCount = shiftsCancelled.count || 0;
      const activeShiftsCount = shiftsActive.count || 0;
      const filledShiftsCount = confirmedShiftsCount + archivedShiftsCount;
      const fillableShiftsCount = totalShiftsCount - cancelledShiftsCount;
      const fillRateValue = fillableShiftsCount > 0 ? Math.round((filledShiftsCount / fillableShiftsCount) * 100) : 0;

      return {
        totalDoctors,
        activeDoctors: doctorData.filter((d) => d.status === "active").length,
        doctorsThisMonth: doctorsThisMonthCount,
        doctorsLastMonth: doctorsLastMonthCount,
        totalHospitals,
        hospitalAccounts,
        hospitalsPipeline,
        hospitalsThisMonth: hospitalsLast30,
        hospitalsLastMonth: hospitalsLastCount,
        totalDeals: dealData.length,
        pipelineValue: openPipelineValue,
        totalRevenue,
        subscriptionRevenue,
        shiftRevenue,
        totalShiftCount,
        revenueThis,
        revenueLast,
        totalInvestors: investorData.length,
        activeInvestors: investorData.filter((i) => i.status === "active").length,
        // Shifts
        totalShifts: totalShiftsCount,
        confirmedShifts: confirmedShiftsCount,
        archivedShifts: archivedShiftsCount,
        filledShifts: filledShiftsCount,
        activeShifts: activeShiftsCount,
        fillRate: fillRateValue,
      };
    },
  });
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#1F3A6A]">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: metrics, isLoading } = useMetrics();

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your StatDoctor CRM" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={
            isLoading
              ? "..."
              : `$${(metrics?.totalRevenue ?? 0).toLocaleString()}`
          }
          subtitle={`$${(metrics?.subscriptionRevenue ?? 0).toLocaleString()} subs · $${(metrics?.shiftRevenue ?? 0).toLocaleString()} shifts`}
          icon={DollarSign}
        />
        <MetricCard
          title="Pipeline Value"
          value={
            isLoading
              ? "..."
              : `$${(metrics?.pipelineValue ?? 0).toLocaleString()}`
          }
          subtitle="Open deals not yet converted"
          icon={Handshake}
        />
        <MetricCard
          title="Hospitals"
          value={isLoading ? "..." : metrics?.totalHospitals ?? 0}
          subtitle={`${metrics?.hospitalAccounts ?? 0} accounts · ${metrics?.hospitalsPipeline ?? 0} in pipeline`}
          icon={Building2}
        />
        <MetricCard
          title="Total Doctors"
          value={isLoading ? "..." : metrics?.totalDoctors ?? 0}
          subtitle={`${metrics?.doctorsThisMonth ?? 0} new this month`}
          icon={Stethoscope}
        />
      </div>

      {/* Shifts metrics row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Active Shifts"
          value={isLoading ? "..." : metrics?.activeShifts ?? 0}
          subtitle="open for applications"
          icon={CalendarClock}
        />
        <MetricCard
          title="Confirmed Upcoming"
          value={isLoading ? "..." : metrics?.confirmedShifts ?? 0}
          subtitle="confirmed & awaiting shift date"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Fill Rate"
          value={isLoading ? "..." : `${metrics?.fillRate ?? 0}%`}
          subtitle="of all shifts filled"
          icon={Percent}
        />
      </div>

      {/* Charts row */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineStageChart />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Hospital Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <HospitalGrowthChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Doctor Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <DoctorGrowthChart />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Shift Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftStatusChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Revenue Trend Chart ──────────────────────────────────────────────

const revenueTrendConfig: ChartConfig = {
  subscriptions: { label: "Subscriptions", color: "#22c55e" },
  shifts: { label: "Shifts", color: "#8b5cf6" },
};

function RevenueTrendChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: async () => {
      const { data: deals } = await supabase
        .from("hospital_deals")
        .select("value, name, notes, stage_id, created_at")
        .order("created_at");
      const { data: stages } = await supabase
        .from("hospital_pipeline_stages")
        .select("id, name");

      const closedIds = new Set(
        (stages || [])
          .filter((s) => {
            const n = s.name.toLowerCase();
            return (n.includes("closed") && !n.includes("lost")) || n.includes("won") || n.includes("pay per shift");
          })
          .map((s) => s.id)
      );

      // Group by month
      const monthly: Record<string, { subscriptions: number; shifts: number }> = {};
      const now = new Date();
      // Seed last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthly[key] = { subscriptions: 0, shifts: 0 };
      }

      for (const deal of deals || []) {
        const date = new Date(deal.created_at);
        const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!monthly[key]) monthly[key] = { subscriptions: 0, shifts: 0 };

        if (deal.name?.startsWith("Shift Revenue")) {
          const sm = (deal.notes || "").match(/shifts:(\d+)/);
          const rm = (deal.notes || "").match(/rate:(\d+)/);
          const shifts = sm ? parseInt(sm[1]) : 0;
          const rate = rm ? parseInt(rm[1]) : 99;
          monthly[key].shifts += shifts * rate;
        } else if (closedIds.has(deal.stage_id)) {
          monthly[key].subscriptions += Number(deal.value || 0);
        }
      }

      return Object.entries(monthly).map(([month, vals]) => ({
        month,
        subscriptions: vals.subscriptions,
        shifts: vals.shifts,
        total: vals.subscriptions + vals.shifts,
      }));
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <ChartContainer config={revenueTrendConfig} className="h-[250px] w-full">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="month" className="text-[10px]" tickLine={false} axisLine={false} />
        <YAxis className="text-[10px]" tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toLocaleString()}`} />} />
        <Area type="monotone" dataKey="subscriptions" stackId="1" fill="#22c55e" fillOpacity={0.3} stroke="#22c55e" strokeWidth={2} />
        <Area type="monotone" dataKey="shifts" stackId="1" fill="#8b5cf6" fillOpacity={0.3} stroke="#8b5cf6" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Pipeline Stage Chart ─────────────────────────────────────────────

const pipelineConfig: ChartConfig = {
  count: { label: "Deals", color: "#1F3A6A" },
  value: { label: "Value", color: "#A4D65E" },
};

function PipelineStageChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-stage-chart"],
    queryFn: async () => {
      const { data: stages } = await supabase
        .from("hospital_pipeline_stages")
        .select("id, name, color")
        .order("position");
      const { data: deals } = await supabase
        .from("hospital_deals")
        .select("stage_id, value, name");

      const nonShiftDeals = (deals || []).filter((d) => !d.name?.startsWith("Shift Revenue"));

      return (stages || []).map((stage) => {
        const stageDeals = nonShiftDeals.filter((d) => d.stage_id === stage.id);
        return {
          name: stage.name.replace("Closed (", "").replace(")", "").replace("Closed ", ""),
          count: stageDeals.length,
          value: stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
          color: stage.color || "#1F3A6A",
        };
      });
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <ChartContainer config={pipelineConfig} className="h-[250px] w-full">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} />
        <YAxis className="text-[10px]" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => name === "value" ? `$${Number(value).toLocaleString()}` : `${value} deals`} />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ── Hospital Growth Chart ────────────────────────────────────────────

const hospitalGrowthConfig: ChartConfig = {
  hospitals: { label: "Hospitals", color: "#1F3A6A" },
};

function HospitalGrowthChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["hospital-growth"],
    queryFn: async () => {
      const { data: hospitals } = await supabase
        .from("hospitals")
        .select("created_at")
        .order("created_at");

      const monthly: Record<string, number> = {};
      const now = new Date();
      // Seed last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthly[key] = 0;
      }

      let cumulative = 0;
      // Count hospitals created before our window
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      for (const h of hospitals || []) {
        if (new Date(h.created_at) < sixMonthsAgo) {
          cumulative++;
        }
      }

      const result: { month: string; hospitals: number }[] = [];
      for (const key of Object.keys(monthly)) {
        const [mon, yr] = key.split(" ");
        for (const h of hospitals || []) {
          const d = new Date(h.created_at);
          const hKey = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          if (hKey === key) cumulative++;
        }
        result.push({ month: key, hospitals: cumulative });
      }

      return result;
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <ChartContainer config={hospitalGrowthConfig} className="h-[200px] w-full">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="month" className="text-[10px]" tickLine={false} axisLine={false} />
        <YAxis className="text-[10px]" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="hospitals" fill="#1F3A6A" fillOpacity={0.15} stroke="#1F3A6A" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Doctor Growth Chart ──────────────────────────────────────────────

const doctorGrowthConfig: ChartConfig = {
  doctors: { label: "Total Doctors", color: "#8b5cf6" },
  newDoctors: { label: "New This Month", color: "#A4D65E" },
};

function DoctorGrowthChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["doctor-growth"],
    queryFn: async () => {
      const { data: doctors } = await supabase.from("doctors").select("notes, created_at").order("created_at");

      const now = new Date();
      // Build month keys for last 8 months
      const monthKeys: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthKeys.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
      }

      // Parse registration dates
      const regDates: Date[] = [];
      for (const doc of doctors || []) {
        const regDate = parseRegisteredDate(doc.notes);
        regDates.push(regDate || new Date(doc.created_at));
      }
      regDates.sort((a, b) => a.getTime() - b.getTime());

      // Count before our window
      const windowStart = new Date(now.getFullYear(), now.getMonth() - 7, 1);
      let cumulative = regDates.filter((d) => d < windowStart).length;

      const result: { month: string; doctors: number; newDoctors: number }[] = [];
      for (const key of monthKeys) {
        let newThisMonth = 0;
        for (const d of regDates) {
          const dKey = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          if (dKey === key) newThisMonth++;
        }
        cumulative += newThisMonth;
        result.push({ month: key, doctors: cumulative, newDoctors: newThisMonth });
      }

      return result;
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <ChartContainer config={doctorGrowthConfig} className="h-[200px] w-full">
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="month" className="text-[10px]" tickLine={false} axisLine={false} />
        <YAxis className="text-[10px]" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="doctors" fill="#8b5cf6" fillOpacity={0.15} stroke="#8b5cf6" strokeWidth={2} />
        <Bar dataKey="newDoctors" fill="#A4D65E" radius={[3, 3, 0, 0]} barSize={20} />
      </ComposedChart>
    </ChartContainer>
  );
}

// ── Shift Status Chart ───────────────────────────────────────────────

const shiftStatusConfig: ChartConfig = {
  confirmed: { label: "Confirmed", color: "#22c55e" },
  active: { label: "Active", color: "#3b82f6" },
  archived: { label: "Completed", color: "#f59e0b" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
};

function ShiftStatusChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["shift-status-chart"],
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "Confirmed"),
        supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "Active"),
        supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "Archived"),
        supabase.from("shifts").select("*", { count: "exact", head: true }).or("status.eq.Cancelled Doctor,status.eq.Cancelled Hospital"),
      ]);

      return [
        { name: "Confirmed", value: results[0].count || 0, color: "#22c55e" },
        { name: "Active", value: results[1].count || 0, color: "#3b82f6" },
        { name: "Completed", value: results[2].count || 0, color: "#f59e0b" },
        { name: "Cancelled", value: results[3].count || 0, color: "#ef4444" },
      ].filter((d) => d.value > 0);
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <ChartContainer config={shiftStatusConfig} className="h-[160px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} shifts`} />} />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            dataKey="value"
            nameKey="name"
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium">{d.value}</span>
            <span className="text-muted-foreground">({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet. Start adding records to see activity here.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.id} className="flex items-start gap-3 text-sm">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#A4D65E]" />
          <div>
            <p className="font-medium">{item.summary || item.action}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

