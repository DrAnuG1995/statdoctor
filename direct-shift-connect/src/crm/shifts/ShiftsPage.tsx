import { useState, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import { Input } from "@/components/ui/input";

const ShiftCalendar = lazy(() => import("./ShiftCalendar"));
const ShiftMatching = lazy(() => import("./ShiftMatching"));
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock,
  Search,
  Building2,
  DollarSign,
  MapPin,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Archive,
  List,
  CalendarDays,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Shift } from "../shared/types";

function useShifts(
  search: string,
  statusFilter: string,
  hospitalFilter: string,
  specialtyFilter: string
) {
  return useQuery({
    queryKey: ["shifts", search, statusFilter, hospitalFilter, specialtyFilter],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select("*")
        .order("start_time", { ascending: false })
        .range(0, 1999);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (hospitalFilter && hospitalFilter !== "all") {
        query = query.eq("hospital_name", hospitalFilter);
      }

      if (specialtyFilter && specialtyFilter !== "all") {
        query = query.eq("specialty", specialtyFilter);
      }

      if (search) {
        query = query.or(
          `hospital_name.ilike.%${search}%,specialty.ilike.%${search}%,hospital_location.ilike.%${search}%,shift_id.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shift[];
    },
  });
}

function useShiftFilters() {
  return useQuery({
    queryKey: ["shift-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("hospital_name, specialty, status")
        .range(0, 1999);
      if (error) throw error;

      const hospitals = [
        ...new Set(data.map((d) => d.hospital_name).filter(Boolean)),
      ].sort();
      const specialties = [
        ...new Set(data.map((d) => d.specialty).filter(Boolean)),
      ].sort();
      const statuses = [
        ...new Set(data.map((d) => d.status).filter(Boolean)),
      ].sort();

      return { hospitals, specialties, statuses };
    },
  });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    Archived: "bg-gray-50 text-gray-600 border-gray-200",
    "Cancelled Doctor": "bg-red-50 text-red-600 border-red-200",
    "Cancelled Hospital": "bg-orange-50 text-orange-600 border-orange-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-50 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type Tab = "list" | "calendar" | "matching";

export default function ShiftsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab) || "list";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  const { data: shifts = [], isLoading } = useShifts(
    search,
    statusFilter,
    hospitalFilter,
    specialtyFilter
  );
  const { data: filters } = useShiftFilters();

  const setTab = (tab: Tab) => {
    setSearchParams(tab === "list" ? {} : { tab });
  };

  const metrics = useMemo(() => {
    const totalShifts = shifts.length;
    const activeShifts = shifts.filter((s) => s.status === "Active").length;
    const confirmedShifts = shifts.filter(
      (s) => s.status === "Confirmed"
    ).length;
    const archivedShifts = shifts.filter((s) => s.status === "Archived").length;
    const uniqueHospitals = new Set(shifts.map((s) => s.hospital_name)).size;
    const avgRate =
      shifts.length > 0
        ? Math.round(
            shifts.reduce((sum, s) => sum + (s.rate_per_hour || 0), 0) /
              shifts.length
          )
        : 0;
    const totalValue = shifts.reduce((sum, s) => {
      const start = s.start_time ? new Date(s.start_time).getTime() : 0;
      const end = s.end_time ? new Date(s.end_time).getTime() : 0;
      const hours = start && end ? (end - start) / 3600000 : 0;
      return sum + hours * (s.rate_per_hour || 0);
    }, 0);

    return {
      totalShifts,
      activeShifts,
      confirmedShifts,
      archivedShifts,
      uniqueHospitals,
      avgRate,
      totalValue,
    };
  }, [shifts]);

  return (
    <div>
      <PageHeader
        title="Shifts & Placements"
        description={
          activeTab === "calendar"
            ? "Calendar view of all shifts"
            : activeTab === "matching"
              ? "Match open shifts with eligible doctors"
              : `${shifts.length} shift${shifts.length !== 1 ? "s" : ""} ${statusFilter !== "all" || hospitalFilter !== "all" || specialtyFilter !== "all" || search ? "found" : "total"}`
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setTab("list")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "list"
              ? "bg-white text-[#1F3A6A] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-4 w-4" />
          List View
        </button>
        <button
          onClick={() => setTab("calendar")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "calendar"
              ? "bg-white text-[#1F3A6A] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Calendar
        </button>
        <button
          onClick={() => setTab("matching")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "matching"
              ? "bg-white text-[#1F3A6A] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          Doctor Matching
        </button>
      </div>

      {activeTab === "calendar" ? (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading calendar...</div>}>
          <ShiftCalendar />
        </Suspense>
      ) : activeTab === "matching" ? (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading matching...</div>}>
          <ShiftMatching />
        </Suspense>
      ) : (
      <>
      {/* Metrics row */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          title="Active Shifts"
          value={metrics.activeShifts}
          icon={CalendarClock}
          color="bg-green-600"
        />
        <MetricCard
          title="Confirmed"
          value={metrics.confirmedShifts}
          icon={CheckCircle2}
          color="bg-blue-600"
        />
        <MetricCard
          title="Avg Rate"
          value={`$${metrics.avgRate}/hr`}
          icon={DollarSign}
          color="bg-[#1F3A6A]"
        />
        <MetricCard
          title="Total Value"
          value={`$${Math.round(metrics.totalValue).toLocaleString()}`}
          icon={TrendingUp}
          subtitle={`across ${metrics.uniqueHospitals} hospitals`}
          color="bg-[#A4D65E]"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search hospital, specialty, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(filters?.statuses || []).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All hospitals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hospitals</SelectItem>
            {(filters?.hospitals || []).map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialties</SelectItem>
            {(filters?.specialties || []).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Skill Level</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No shifts found
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id} className="hover:bg-muted/50">
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {formatDate(shift.start_time)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(shift.start_time)} -{" "}
                      {formatTime(shift.end_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {shift.hospital_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {shift.hospital_location
                        ? shift.hospital_location
                            .replace(", Australia", "")
                            .trim()
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {shift.specialty ? (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                        {shift.specialty}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {shift.skill_level || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-green-700">
                      ${shift.rate_per_hour}
                    </span>
                    <span className="text-xs text-muted-foreground">/hr</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={shift.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </>
      )}
    </div>
  );
}
