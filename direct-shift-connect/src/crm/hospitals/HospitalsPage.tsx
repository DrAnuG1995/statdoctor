import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import { DataTable, Column } from "../shared/components/DataTable";
import { BulkActionsToolbar, downloadCSV } from "../shared/components/BulkActionsToolbar";
import { StatusBadge } from "../shared/components/StatusBadge";
import { EmptyState } from "../shared/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Search, DollarSign, TrendingUp, CheckCircle2, BarChart3, Plus, Pencil, Trash2, X, Check, Upload, Mail } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "../shared/logActivity";
import { ComposeEmailDialog } from "../shared/components/ComposeEmailDialog";
import type { Hospital, HospitalStatus, PipelineStage, HospitalDeal } from "../shared/types";
import PipelinePage from "./PipelinePage";
import ProspectsPage from "./ProspectsPage";

// ── Shift tracking helpers ──────────────────────────────────────────

interface ShiftEntry {
  id: string | null; // deal id, null for new
  hospital_name: string;
  hospital_id: string | null;
  shifts: number;
  rate: number;
  revenue: number;
}

const SHIFT_DEAL_PREFIX = "Shift Revenue";

function parseShiftDeal(deal: HospitalDeal & { hospital?: { id: string; name: string } | null }): ShiftEntry | null {
  if (!deal.name?.startsWith(SHIFT_DEAL_PREFIX)) return null;
  const notes = deal.notes || "";
  const shiftsMatch = notes.match(/shifts:(\d+)/);
  const rateMatch = notes.match(/rate:(\d+)/);
  const shifts = shiftsMatch ? parseInt(shiftsMatch[1]) : 0;
  const rate = rateMatch ? parseInt(rateMatch[1]) : 99;
  return {
    id: deal.id,
    hospital_name: deal.hospital?.name || deal.name.replace(`${SHIFT_DEAL_PREFIX} — `, ""),
    hospital_id: deal.hospital_id,
    shifts,
    rate,
    revenue: shifts * rate,
  };
}

// ── Revenue metrics hook ────────────────────────────────────────────

function useRevenueMetrics() {
  // Fetch pipeline stages
  const stagesQuery = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_pipeline_stages")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as PipelineStage[];
    },
  });

  // Fetch all deals with hospital info
  const dealsQuery = useQuery({
    queryKey: ["pipeline-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_deals")
        .select("*, hospital:hospitals(id, name, contact_name, contact_email, contact_phone), stage:hospital_pipeline_stages(id, name, color)")
        .order("position");
      if (error) throw error;
      return data as (HospitalDeal & { hospital: { id: string; name: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null } | null; stage: PipelineStage | null })[];
    },
  });

  const stages = stagesQuery.data || [];
  const deals = dealsQuery.data || [];

  // Separate shift revenue deals from other deals
  const shiftEntries: ShiftEntry[] = [];
  const otherDeals: typeof deals = [];
  for (const d of deals) {
    const entry = parseShiftDeal(d);
    if (entry) {
      shiftEntries.push(entry);
    } else {
      otherDeals.push(d);
    }
  }

  const totalShifts = shiftEntries.reduce((sum, e) => sum + e.shifts, 0);
  const shiftRevenue = shiftEntries.reduce((sum, e) => sum + e.revenue, 0);

  // Identify "closed won" stages (not "lost")
  const closedWonStageIds = new Set(
    stages
      .filter((s) => {
        const n = s.name.toLowerCase();
        return (n.includes("closed") && !n.includes("lost")) || n.includes("won") || n.includes("subscription") || n.includes("pay per shift");
      })
      .map((s) => s.id)
  );

  const lostStageIds = new Set(
    stages.filter((s) => s.name.toLowerCase().includes("lost")).map((s) => s.id)
  );

  const totalPipelineValue = otherDeals
    .filter((d) => !closedWonStageIds.has(d.stage_id) && !lostStageIds.has(d.stage_id))
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  const subscriptionRevenue = otherDeals
    .filter((d) => closedWonStageIds.has(d.stage_id))
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  const totalRevenue = subscriptionRevenue + shiftRevenue;

  return {
    totalPipelineValue,
    subscriptionRevenue,
    shiftRevenue,
    totalShifts,
    shiftEntries,
    totalRevenue,
    stages,
    isLoading: stagesQuery.isLoading || dealsQuery.isLoading,
  };
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function RevenueCards() {
  const queryClient = useQueryClient();
  const {
    totalPipelineValue,
    subscriptionRevenue,
    shiftRevenue,
    totalShifts,
    shiftEntries,
    totalRevenue,
    stages,
    isLoading,
  } = useRevenueMetrics();

  const [showShiftsDialog, setShowShiftsDialog] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editShifts, setEditShifts] = useState("");
  const [editRate, setEditRate] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [newHospitalId, setNewHospitalId] = useState("");
  const [newShifts, setNewShifts] = useState("");
  const [newRate, setNewRate] = useState("99");
  const [saving, setSaving] = useState(false);

  // Fetch hospitals for the "Add Hospital" dropdown
  const { data: allHospitals = [] } = useQuery({
    queryKey: ["hospitals-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Find a closed-won stage to store shift revenue deals
  const closedWonStage = stages.find((s) => {
    const n = s.name.toLowerCase();
    return n.includes("pay per shift") || (n.includes("closed") && !n.includes("lost"));
  });

  // Upsert shift entry (create or update)
  const upsertShiftEntry = useMutation({
    mutationFn: async (entry: { id: string | null; hospital_id: string; hospital_name: string; shifts: number; rate: number }) => {
      const dealName = `${SHIFT_DEAL_PREFIX} — ${entry.hospital_name}`;
      const notes = `shifts:${entry.shifts}|rate:${entry.rate}`;
      const value = entry.shifts * entry.rate;

      if (entry.id) {
        // Update existing deal
        const { error } = await supabase
          .from("hospital_deals")
          .update({ value, notes, updated_at: new Date().toISOString() })
          .eq("id", entry.id);
        if (error) throw error;
      } else {
        // Create new deal
        if (!closedWonStage) throw new Error("No closed-won pipeline stage found");
        const { error } = await supabase.from("hospital_deals").insert({
          name: dealName,
          hospital_id: entry.hospital_id,
          stage_id: closedWonStage.id,
          value,
          notes,
          expected_close: new Date().toISOString().slice(0, 10),
          position: 999,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast.success("Shift entry saved");
      logActivity({
        module: "hospitals",
        entityId: variables.hospital_id,
        action: "shift_updated",
        summary: `Updated shifts for ${variables.hospital_name}: ${variables.shifts} shifts @ $${variables.rate}`,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete shift entry
  const deleteShiftEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hospital_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast.success("Shift entry removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditShifts(String(shiftEntries[idx].shifts));
    setEditRate(String(shiftEntries[idx].rate));
  };

  const saveEdit = async (entry: ShiftEntry) => {
    setSaving(true);
    try {
      await upsertShiftEntry.mutateAsync({
        id: entry.id,
        hospital_id: entry.hospital_id || "",
        hospital_name: entry.hospital_name,
        shifts: parseInt(editShifts) || 0,
        rate: parseInt(editRate) || 99,
      });
      setEditingIdx(null);
    } finally {
      setSaving(false);
    }
  };

  const saveNewRow = async () => {
    const hospital = allHospitals.find((h) => h.id === newHospitalId);
    if (!hospital || !newShifts) return;
    setSaving(true);
    try {
      await upsertShiftEntry.mutateAsync({
        id: null,
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        shifts: parseInt(newShifts) || 0,
        rate: parseInt(newRate) || 99,
      });
      setShowAddRow(false);
      setNewHospitalId("");
      setNewShifts("");
      setNewRate("99");
    } finally {
      setSaving(false);
    }
  };

  // Hospitals already tracked — exclude from add dropdown
  const trackedHospitalIds = new Set(shiftEntries.map((e) => e.hospital_id).filter(Boolean));
  const availableHospitals = allHospitals.filter((h) => !trackedHospitalIds.has(h.id));

  if (isLoading) return null;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Pipeline Value */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalPipelineValue)}</p>
              <p className="text-xs text-muted-foreground">Open deals</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Revenue */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-50 p-2.5">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription Revenue</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(subscriptionRevenue)}</p>
              <p className="text-xs text-muted-foreground">Closed deals</p>
            </div>
          </CardContent>
        </Card>

        {/* Shift Revenue — with clickable shifts filled counter */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shift Revenue</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(shiftRevenue)}</p>
                <p className="text-xs text-muted-foreground">{totalShifts} shifts filled</p>
              </div>
            </div>
            <button
              className="text-right border-l pl-3 cursor-pointer hover:bg-purple-50 rounded-lg p-2 -mr-1 transition-colors"
              onClick={() => setShowShiftsDialog(true)}
              title="Edit shifts by hospital"
            >
              <p className="text-2xl font-bold text-purple-600">{totalShifts}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">shifts<br/>filled</p>
            </button>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-[#1F3A6A]/5 p-2.5">
              <TrendingUp className="h-5 w-5 text-[#1F3A6A]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold text-[#1F3A6A]">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Subscriptions + Shifts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editable Shifts by Hospital Dialog */}
      <Dialog open={showShiftsDialog} onOpenChange={(open) => { setShowShiftsDialog(open); if (!open) { setEditingIdx(null); setShowAddRow(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              Shift Revenue Tracker
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {/* Total row */}
            <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 text-sm font-semibold">
              <span className="text-purple-800">Total</span>
              <div className="flex items-center gap-4">
                <span className="text-purple-600">{totalShifts} shifts</span>
                <span className="text-purple-600">{formatCurrency(shiftRevenue)}</span>
              </div>
            </div>

            {/* Header row */}
            <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="flex-1">Hospital</span>
              <span className="w-16 text-right">Shifts</span>
              <span className="w-16 text-right">Rate</span>
              <span className="w-20 text-right">Revenue</span>
              <span className="w-16" />
            </div>

            {/* Entries */}
            <div className="max-h-[350px] overflow-y-auto space-y-0.5">
              {shiftEntries.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 group"
                >
                  {editingIdx === idx ? (
                    <>
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs">{entry.hospital_name}</span>
                      </div>
                      <Input
                        className="h-7 w-16 text-right text-xs px-1"
                        value={editShifts}
                        onChange={(e) => setEditShifts(e.target.value)}
                        type="number"
                        min={0}
                      />
                      <Input
                        className="h-7 w-16 text-right text-xs px-1"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        type="number"
                        min={0}
                        placeholder="$"
                      />
                      <span className="w-20 text-right text-xs font-medium text-green-600">
                        ${((parseInt(editShifts) || 0) * (parseInt(editRate) || 0)).toLocaleString()}
                      </span>
                      <div className="w-16 flex justify-end gap-0.5">
                        <button
                          className="p-1 rounded hover:bg-green-100 text-green-600"
                          onClick={() => saveEdit(entry)}
                          disabled={saving}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
                          onClick={() => setEditingIdx(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{entry.hospital_name}</span>
                      </div>
                      <span className="w-16 text-right font-medium text-purple-600">{entry.shifts}</span>
                      <span className="w-16 text-right text-muted-foreground">${entry.rate}</span>
                      <span className="w-20 text-right font-medium text-green-600">${entry.revenue.toLocaleString()}</span>
                      <div className="w-16 flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
                          onClick={() => startEdit(idx)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {entry.id && (
                          <button
                            className="p-1 rounded hover:bg-red-100 text-red-500"
                            onClick={() => { if (confirm(`Remove shift entry for ${entry.hospital_name}?`)) deleteShiftEntry.mutate(entry.id!); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {shiftEntries.length === 0 && !showAddRow && (
                <p className="py-4 text-center text-sm text-muted-foreground">No shift entries yet — click "Add Hospital" to start tracking</p>
              )}

              {/* Add new row */}
              {showAddRow && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-purple-200 bg-purple-50/30 px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <Select value={newHospitalId} onValueChange={setNewHospitalId}>
                      <SelectTrigger className="h-7 text-xs bg-white">
                        <SelectValue placeholder="Select hospital..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHospitals.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="h-7 w-16 text-right text-xs px-1"
                    value={newShifts}
                    onChange={(e) => setNewShifts(e.target.value)}
                    type="number"
                    min={0}
                    placeholder="Shifts"
                  />
                  <Input
                    className="h-7 w-16 text-right text-xs px-1"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    type="number"
                    min={0}
                    placeholder="Rate"
                  />
                  <span className="w-20 text-right text-xs font-medium text-green-600">
                    ${((parseInt(newShifts) || 0) * (parseInt(newRate) || 0)).toLocaleString()}
                  </span>
                  <div className="w-16 flex justify-end gap-0.5">
                    <button
                      className="p-1 rounded hover:bg-green-100 text-green-600"
                      onClick={saveNewRow}
                      disabled={saving || !newHospitalId || !newShifts}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
                      onClick={() => { setShowAddRow(false); setNewHospitalId(""); setNewShifts(""); setNewRate("99"); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="mr-auto"
              onClick={() => setShowAddRow(true)}
              disabled={showAddRow}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Hospital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type HospitalWithStage = Hospital & { pipeline_stage?: string };

function useHospitals(search: string, statusFilter: string) {
  return useQuery({
    queryKey: ["hospitals", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("hospitals")
        .select("*, hospital_deals(stage_id, hospital_pipeline_stages:hospital_pipeline_stages(name))")
        .order("name", { ascending: true });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,location.ilike.%${search}%,contact_email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((h: any) => ({
        ...h,
        pipeline_stage: h.hospital_deals?.[0]?.hospital_pipeline_stages?.name || null,
      })) as HospitalWithStage[];
    },
  });
}

function extractState(location: string | null): string {
  if (!location) return "-";
  // Match Australian state abbreviations at end of address (before ", Australia")
  const match = location.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
  return match ? match[1] : "-";
}

const columns: Column<HospitalWithStage>[] = [
  {
    key: "name",
    header: "Hospital",
    render: (row) => (
      <div>
        <div className="font-medium">{row.name}</div>
        {row.contact_name && <div className="text-xs text-muted-foreground">{row.contact_name}</div>}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "location",
    header: "State",
    render: (row) => extractState(row.location),
  },
  {
    key: "contact_email",
    header: "Contact Email",
    render: (row) => row.contact_email ? (
      <span className="text-sm">{row.contact_email}</span>
    ) : "-",
  },
  {
    key: "pipeline_stage" as any,
    header: "Pipeline",
    render: (row: HospitalWithStage) => row.pipeline_stage ? (
      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        {row.pipeline_stage}
      </span>
    ) : "-",
  },
  {
    key: "created_at",
    header: "Added",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

// ── Bulk Import ────────────────────────────────────────────────────

interface BulkImportRow {
  name: string;
  contact_name: string;
  contact_email: string;
  source: string;
  selected: boolean;
}

const WELCOME_PACK_HOSPITALS: BulkImportRow[] = [
  { name: "Katherine Hospital", contact_name: "David Rankin", contact_email: "David.Rankin@nt.gov.au", source: "Welcome Pack — Mar 2026", selected: true },
  { name: "Bobbi Health", contact_name: "Michelle McKibbin", contact_email: "michelle@bobbi.com.au", source: "Welcome Pack — Mar 2026", selected: true },
  { name: "Greenslopes / Ramsay Health", contact_name: "Maria", contact_email: "quioyom@ramsayhealth.com.au", source: "Welcome Pack — Feb 2026", selected: true },
  { name: "HCPA", contact_name: "Nikita Soukhov", contact_email: "nikita@hcpassociation.com.au", source: "Welcome Pack — Feb 2026", selected: true },
  { name: "South West Healthcare", contact_name: "Miranda Sollychin", contact_email: "miranda.sollychin@swh.net.au", source: "Welcome Pack — Nov 2025", selected: true },
  { name: "Mildura Private", contact_name: "Josie", contact_email: "josiez@mildpriv.com.au", source: "Welcome Pack — Oct 2025", selected: true },
  { name: "Alexandra West Health", contact_name: "Taylor Ogilvie", contact_email: "taylor.ogilvie2@awh.org.au", source: "Welcome Pack — Oct 2025", selected: true },
  { name: "Street Side Medics", contact_name: "Nic Brown", contact_email: "nic.brown@streetsidemedics.com.au", source: "Welcome Pack — Oct 2025", selected: true },
  { name: "Raiqa Health", contact_name: "Mohammed Javeed", contact_email: "mohammed.javeed@raiqa.health", source: "Welcome Pack — Oct 2025", selected: true },
  { name: "HEAL Urgent Care", contact_name: "Tim Stewart", contact_email: "timstewart@healurgentcare.com.au", source: "Welcome Pack — Sep 2025", selected: true },
  { name: "MyFastMedical", contact_name: "Farhad Goodarzy", contact_email: "farhad@myfastmedical.com", source: "Welcome Pack — Sep 2025", selected: true },
  { name: "AHCWA", contact_name: "Kimberley Biggs", contact_email: "", source: "Welcome Pack — Aug 2025", selected: true },
  { name: "Northern Beaches Hospital", contact_name: "Matt Day", contact_email: "", source: "Welcome Pack — Nov 2025", selected: true },
  { name: "ForHealth", contact_name: "Thomas McLaughlin", contact_email: "thomas.mclaughlin@forhealth.com.au", source: "Welcome Pack — Nov 2025", selected: true },
];

function BulkImportDialog({
  open,
  onOpenChange,
  existingHospitalNames,
  defaultStageId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingHospitalNames: Set<string>;
  defaultStageId: string | null;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BulkImportRow[]>(() =>
    WELCOME_PACK_HOSPITALS.map((h) => ({
      ...h,
      // Auto-deselect if already exists
      selected: !existingHospitalNames.has(h.name.toLowerCase()),
    }))
  );
  const [customRows, setCustomRows] = useState<BulkImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const allRows = [...rows, ...customRows];
  const selectedCount = allRows.filter((r) => r.selected).length;
  const alreadyExistCount = rows.filter((r) => existingHospitalNames.has(r.name.toLowerCase())).length;

  const toggleRow = (idx: number, isCustom: boolean) => {
    if (isCustom) {
      setCustomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));
    } else {
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));
    }
  };

  const updateCustomRow = (idx: number, field: keyof BulkImportRow, value: string) => {
    setCustomRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const addCustomRow = () => {
    setCustomRows((prev) => [
      ...prev,
      { name: "", contact_name: "", contact_email: "", source: "Manual", selected: true },
    ]);
  };

  const removeCustomRow = (idx: number) => {
    setCustomRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAll = (checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: existingHospitalNames.has(r.name.toLowerCase()) ? false : checked,
      }))
    );
    setCustomRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleImport = async () => {
    const toImport = allRows.filter((r) => r.selected && r.name.trim());
    if (toImport.length === 0) return;

    setImporting(true);
    setImportedCount(0);

    let successCount = 0;
    for (const row of toImport) {
      try {
        // Create hospital
        const { data, error } = await supabase
          .from("hospitals")
          .insert({
            name: row.name.trim(),
            contact_name: row.contact_name || null,
            contact_email: row.contact_email || null,
            status: "pipeline" as HospitalStatus,
            notes: row.source,
          })
          .select()
          .single();
        if (error) throw error;

        // Create pipeline deal in Lead stage
        if (defaultStageId && data) {
          await supabase.from("hospital_deals").insert({
            hospital_id: data.id,
            name: data.name,
            stage_id: defaultStageId,
            value: 0,
            position: 0,
          });
        }

        successCount++;
        setImportedCount(successCount);
      } catch (err) {
        console.error(`Failed to import ${row.name}:`, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["recent-activity"] });

    if (successCount > 0) {
      const names = toImport.slice(0, 3).map((r) => r.name).join(", ");
      logActivity({
        module: "hospitals",
        action: "bulk_import",
        summary: `Bulk imported ${successCount} hospitals: ${names}${successCount > 3 ? "..." : ""}`,
        metadata: { count: successCount },
      });
    }

    toast.success(`Imported ${successCount} hospital${successCount !== 1 ? "s" : ""} into pipeline`);
    setImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#1F3A6A]" />
            Bulk Import Hospitals
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {alreadyExistCount > 0
              ? `${WELCOME_PACK_HOSPITALS.length} hospitals found from welcome packs · ${alreadyExistCount} already in system`
              : `${WELCOME_PACK_HOSPITALS.length} hospitals found from welcome packs`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          {/* Header row */}
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-white border-b pb-2 mb-1">
            <Checkbox
              checked={selectedCount === allRows.filter((r) => !existingHospitalNames.has(r.name.toLowerCase())).length && selectedCount > 0}
              onCheckedChange={(checked) => toggleAll(!!checked)}
            />
            <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hospital</span>
            <span className="w-32 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</span>
            <span className="w-48 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
            <span className="w-36 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</span>
          </div>

          {/* Pre-populated rows */}
          <div className="space-y-0.5">
            {rows.map((row, idx) => {
              const alreadyExists = existingHospitalNames.has(row.name.toLowerCase());
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm ${
                    alreadyExists ? "opacity-40" : row.selected ? "bg-blue-50/50" : ""
                  }`}
                >
                  <Checkbox
                    checked={row.selected}
                    onCheckedChange={() => toggleRow(idx, false)}
                    disabled={alreadyExists}
                  />
                  <span className="flex-1 font-medium truncate">
                    {row.name}
                    {alreadyExists && (
                      <span className="ml-2 text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        already exists
                      </span>
                    )}
                  </span>
                  <span className="w-32 text-muted-foreground truncate">{row.contact_name}</span>
                  <span className="w-48 text-muted-foreground truncate text-xs">{row.contact_email || "—"}</span>
                  <span className="w-36 text-muted-foreground truncate text-xs">{row.source}</span>
                </div>
              );
            })}

            {/* Custom rows */}
            {customRows.map((row, idx) => (
              <div key={`custom-${idx}`} className="flex items-center gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/20 px-1 py-1.5 text-sm">
                <Checkbox
                  checked={row.selected}
                  onCheckedChange={() => toggleRow(idx, true)}
                />
                <Input
                  className="flex-1 h-7 text-sm"
                  value={row.name}
                  onChange={(e) => updateCustomRow(idx, "name", e.target.value)}
                  placeholder="Hospital name *"
                />
                <Input
                  className="w-32 h-7 text-sm"
                  value={row.contact_name}
                  onChange={(e) => updateCustomRow(idx, "contact_name", e.target.value)}
                  placeholder="Contact"
                />
                <Input
                  className="w-48 h-7 text-xs"
                  value={row.contact_email}
                  onChange={(e) => updateCustomRow(idx, "contact_email", e.target.value)}
                  placeholder="Email"
                />
                <div className="w-36 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Manual</span>
                  <button
                    className="p-1 rounded hover:bg-red-100 text-red-500"
                    onClick={() => removeCustomRow(idx)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={addCustomRow}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Custom
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            <Button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
            >
              {importing
                ? `Importing ${importedCount}/${selectedCount}...`
                : `Import ${selectedCount} Hospital${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HospitalsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: hospitals = [], isLoading } = useHospitals(search, statusFilter);

  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));
  const existingHospitalNames = new Set(hospitals.map((h) => h.name.toLowerCase()));

  const bulkConfig = {
    entityName: "hospital",
    statuses: [
      { value: "active", label: "Active" },
      { value: "pipeline", label: "Pipeline" },
      { value: "pending", label: "Pending" },
      { value: "churned", label: "Churned" },
    ],
    onStatusChange: async (ids: string[], status: string) => {
      const { error } = await supabase
        .from("hospitals")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      toast.success(`${ids.length} hospital${ids.length !== 1 ? "s" : ""} updated to ${status}`);
    },
    onExport: (ids: string[]) => {
      const rows = (ids.length > 0 ? ids.map((id) => hospitalMap.get(id)).filter(Boolean) : hospitals) as HospitalWithStage[];
      downloadCSV(
        `hospitals-export-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Name", "Status", "Location", "Contact Name", "Contact Email", "Contact Phone", "Pipeline Stage", "Added"],
        rows.map((h) => [
          h.name,
          h.status,
          h.location || "",
          h.contact_name || "",
          h.contact_email || "",
          h.contact_phone || "",
          h.pipeline_stage || "",
          h.created_at?.slice(0, 10) || "",
        ])
      );
      toast.success(`Exported ${rows.length} hospital${rows.length !== 1 ? "s" : ""}`);
    },
    getEmail: (id: string) => hospitalMap.get(id)?.contact_email || null,
    getName: (id: string) => hospitalMap.get(id)?.name || "",
    showEmail: true,
    showDelete: false,
  };

  // Fetch pipeline stages for the Add Hospital form
  const { data: addFormStages = [] } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_pipeline_stages")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as PipelineStage[];
    },
  });

  // Default to first stage (Lead) if none selected
  const defaultStageId = addFormStages.length > 0 ? addFormStages[0].id : null;

  const addHospital = useMutation({
    mutationFn: async ({ hospital, stageId, dealValue }: { hospital: Partial<Hospital>; stageId?: string; dealValue?: number }) => {
      const { data, error } = await supabase.from("hospitals").insert(hospital).select().single();
      if (error) throw error;
      // Always create a pipeline deal — default to first stage (Lead)
      const finalStageId = stageId || defaultStageId;
      if (finalStageId && data) {
        const { error: dealError } = await supabase.from("hospital_deals").insert({
          hospital_id: data.id,
          name: `${data.name}`,
          stage_id: finalStageId,
          value: dealValue || 0,
          position: 0,
        });
        if (dealError) throw dealError;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      setShowAddDialog(false);
      toast.success("Hospital added");
      if (data) {
        logActivity({
          module: "hospitals",
          entityId: data.id,
          action: "hospital_added",
          summary: `Added ${data.name} to pipeline`,
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const stageId = (form.get("pipeline_stage") as string) || undefined;
    const dealValue = parseFloat((form.get("deal_value") as string) || "0") || undefined;
    addHospital.mutate({
      hospital: {
        name: form.get("name") as string,
        type: (form.get("type") as string) || null,
        location: (form.get("location") as string) || null,
        contact_name: (form.get("contact_name") as string) || null,
        contact_email: (form.get("contact_email") as string) || null,
        contact_phone: (form.get("contact_phone") as string) || null,
        status: (form.get("status") as HospitalStatus) || "pipeline",
        subscription_tier: (form.get("subscription_tier") as string) || null,
        notes: (form.get("notes") as string) || null,
      },
      stageId,
      dealValue,
    });
  };

  return (
    <div>
      <PageHeader
        title="Hospitals"
        description={`${hospitals.length} hospital${hospitals.length !== 1 ? "s" : ""} total`}
        actionLabel="Add Hospital"
        onAction={() => setShowAddDialog(true)}
        extraActions={
          <>
            {selectedIds.size > 0 && (
              <Button variant="outline" onClick={() => setShowBulkEmail(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Email {selectedIds.size}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowBulkImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </>
        }
      />

      <RevenueCards />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pipeline">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BulkActionsToolbar
            selectedIds={selectedIds}
            onClear={() => setSelectedIds(new Set())}
            config={bulkConfig}
            totalCount={hospitals.length}
          />

          {!isLoading && hospitals.length === 0 && !search && statusFilter === "all" ? (
            <EmptyState
              icon={Building2}
              title="No hospitals yet"
              description="Add your first hospital to get started"
              actionLabel="Add Hospital"
              onAction={() => setShowAddDialog(true)}
            />
          ) : (
            <DataTable<HospitalWithStage>
              columns={columns}
              data={hospitals}
              loading={isLoading}
              onRowClick={(hospital) => navigate(`/crm/hospitals/${hospital.id}`)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <PipelinePage />
        </TabsContent>

        <TabsContent value="prospects" className="mt-4">
          <ProspectsPage existingHospitalNames={existingHospitalNames} hospitalNameToId={new Map(hospitals.map((h) => [h.name.toLowerCase(), h.id]))} />
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Hospital</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Hospital Name *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input id="type" name="type" placeholder="NHS, Private, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="pipeline">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pipeline">Pipeline</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input id="contact_name" name="contact_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input id="contact_phone" name="contact_phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription_tier">Subscription Tier</Label>
                <Input id="subscription_tier" name="subscription_tier" />
              </div>
            </div>

            {/* Pipeline deal fields */}
            <div className="rounded-lg border bg-blue-50/30 p-4 space-y-4">
              <p className="text-sm font-medium text-[#1F3A6A]">Pipeline</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pipeline_stage">Pipeline Stage</Label>
                  <Select name="pipeline_stage" defaultValue={defaultStageId || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {addFormStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal_value">Deal Value ($)</Label>
                  <Input id="deal_value" name="deal_value" type="number" step="0.01" placeholder="0" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90" disabled={addHospital.isPending}>
                {addHospital.isPending ? "Adding..." : "Add Hospital"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        existingHospitalNames={existingHospitalNames}
        defaultStageId={defaultStageId}
      />

      <ComposeEmailDialog
        open={showBulkEmail}
        onOpenChange={setShowBulkEmail}
        recipients={Array.from(selectedIds)
          .map((hId) => hospitalMap.get(hId))
          .filter(Boolean)
          .map((h) => ({
            name: h!.contact_name || h!.name,
            email: h!.contact_email || "",
            entityId: h!.id,
          }))}
      />
    </div>
  );
}
