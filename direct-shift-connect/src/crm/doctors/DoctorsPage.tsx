import { useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import { DataTable, Column } from "../shared/components/DataTable";
import { BulkActionsToolbar, downloadCSV } from "../shared/components/BulkActionsToolbar";
import { StatusBadge } from "../shared/components/StatusBadge";
import { EmptyState } from "../shared/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope, Search, Check, X, AlertTriangle, ArrowUpDown, Users, GitBranch, Mail } from "lucide-react";
import { toast } from "sonner";
import type { Doctor, DoctorStatus } from "../shared/types";

const OnboardingPipeline = lazy(() => import("./OnboardingPipeline"));
const BulkEmail = lazy(() => import("./BulkEmail"));

function useDoctors(search: string, statusFilter: string, skillFilter: string, specialityFilter: string) {
  return useQuery({
    queryKey: ["doctors", search, statusFilter, skillFilter, specialityFilter],
    queryFn: async () => {
      let query = supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (skillFilter && skillFilter !== "all") {
        query = query.eq("skill_level", skillFilter);
      }

      if (specialityFilter && specialityFilter !== "all") {
        query = query.contains("specialities", [specialityFilter]);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,specialty.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Doctor[];
    },
  });
}

function useDistinctSkillLevels() {
  return useQuery({
    queryKey: ["doctor-skill-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("skill_level")
        .not("skill_level", "is", null);
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.skill_level).filter(Boolean))] as string[];
      return unique.sort();
    },
  });
}

function useDistinctSpecialities() {
  return useQuery({
    queryKey: ["doctor-specialities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("specialities");
      if (error) throw error;
      const all = data.flatMap((d) => d.specialities || []);
      const unique = [...new Set(all)].filter(Boolean);
      return unique.sort();
    },
  });
}

function getUnverifiedDocCount(notes: string | null): number {
  const match = notes?.match(/\[UNVERIFIED_DOCS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : 0;
}

function getUnverifiedRefCount(notes: string | null): number {
  const match = notes?.match(/\[UNVERIFIED_REFS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : 0;
}

type SortField = "has_references" | "has_documents" | null;
type SortDir = "asc" | "desc";

function getColumns(sortField: SortField, onToggleSort: (field: SortField) => void): Column<Doctor>[] {
  return [
    {
      key: "full_name",
      header: "Name",
      render: (row) => <div className="font-medium">{row.full_name}</div>,
    },
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.email || "-"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.phone || "-",
    },
    {
      key: "skill_level",
      header: "Skill Level",
      render: (row) => row.skill_level || "-",
    },
    {
      key: "specialities",
      header: "Speciality",
      render: (row) =>
        row.specialities?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.specialities.map((s) => (
              <span key={s} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                {s}
              </span>
            ))}
          </div>
        ) : (
          "-"
        ),
    },
    {
      key: "has_references",
      header: (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onToggleSort("has_references"); }}
        >
          References
          <ArrowUpDown className={`h-3 w-3 ${sortField === "has_references" ? "text-[#1F3A6A]" : "text-muted-foreground"}`} />
        </button>
      ),
      render: (row) => {
        const unverifiedRefs = getUnverifiedRefCount(row.notes);
        if (unverifiedRefs > 0) {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              <AlertTriangle className="h-3 w-3" />
              {unverifiedRefs} pending
            </span>
          );
        }
        return row.has_references ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-red-400" />
        );
      },
    },
    {
      key: "has_documents",
      header: (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onToggleSort("has_documents"); }}
        >
          Documents
          <ArrowUpDown className={`h-3 w-3 ${sortField === "has_documents" ? "text-[#1F3A6A]" : "text-muted-foreground"}`} />
        </button>
      ),
      render: (row) => {
        const unverified = getUnverifiedDocCount(row.notes);
        if (unverified > 0) {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {unverified} pending
            </span>
          );
        }
        return row.has_documents ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-red-400" />
        );
      },
    },
  ];
}

type Tab = "list" | "onboarding" | "email";

export default function DoctorsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab) || "list";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [specialityFilter, setSpecialityFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: doctors = [], isLoading } = useDoctors(search, statusFilter, skillFilter, specialityFilter);
  const { data: skillLevels = [] } = useDistinctSkillLevels();
  const { data: specialities = [] } = useDistinctSpecialities();

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedDoctors = sortField
    ? [...doctors].sort((a, b) => {
        const aVal = a[sortField] ? 1 : 0;
        const bVal = b[sortField] ? 1 : 0;
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      })
    : doctors;

  const columns = getColumns(sortField, handleToggleSort);

  const addDoctor = useMutation({
    mutationFn: async (doctor: Partial<Doctor>) => {
      const { data, error } = await supabase.from("doctors").insert(doctor).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setShowAddDialog(false);
      toast.success("Doctor added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addDoctor.mutate({
      full_name: form.get("full_name") as string,
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      status: (form.get("status") as DoctorStatus) || "pipeline",
      specialty: (form.get("specialty") as string) || null,
      location: (form.get("location") as string) || null,
      notes: (form.get("notes") as string) || null,
      app_downloaded: form.get("app_downloaded") === "on",
    });
  };

  const setTab = (tab: Tab) => {
    setSearchParams(tab === "list" ? {} : { tab });
  };

  const doctorMap = new Map(sortedDoctors.map((d) => [d.id, d]));

  const bulkConfig = {
    entityName: "doctor",
    statuses: [
      { value: "active", label: "Active" },
      { value: "pipeline", label: "Pipeline" },
      { value: "unsubscribed", label: "Unsubscribed" },
      { value: "deleted", label: "Deleted" },
    ],
    onStatusChange: async (ids: string[], status: string) => {
      const { error } = await supabase
        .from("doctors")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success(`${ids.length} doctor${ids.length !== 1 ? "s" : ""} updated to ${status}`);
    },
    onExport: (ids: string[]) => {
      const rows = (ids.length > 0 ? ids.map((id) => doctorMap.get(id)).filter(Boolean) : sortedDoctors) as Doctor[];
      downloadCSV(
        `doctors-export-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Name", "Email", "Phone", "Status", "Skill Level", "Specialities", "AHPRA", "Documents", "References", "Registered"],
        rows.map((d) => [
          d.full_name,
          d.email || "",
          d.phone || "",
          d.status,
          d.skill_level || "",
          (d.specialities || []).join("; "),
          d.ahpra_number || "",
          d.has_documents ? "Yes" : "No",
          d.has_references ? "Yes" : "No",
          d.registered_date || d.created_at?.slice(0, 10) || "",
        ])
      );
      toast.success(`Exported ${rows.length} doctor${rows.length !== 1 ? "s" : ""}`);
    },
    getEmail: (id: string) => doctorMap.get(id)?.email || null,
    getName: (id: string) => doctorMap.get(id)?.full_name || "",
    showEmail: true,
    showDelete: false,
  };

  return (
    <div>
      <PageHeader
        title="Doctors"
        description={
          activeTab === "onboarding"
            ? "Doctor onboarding pipeline"
            : activeTab === "email"
              ? "Filter, select and email doctors"
              : search || statusFilter !== "all" || skillFilter !== "all" || specialityFilter !== "all"
                ? `${sortedDoctors.length} doctor${sortedDoctors.length !== 1 ? "s" : ""} found`
                : `${sortedDoctors.length} doctor${sortedDoctors.length !== 1 ? "s" : ""} total`
        }
        actionLabel={activeTab === "list" ? "Add Doctor" : undefined}
        onAction={activeTab === "list" ? () => setShowAddDialog(true) : undefined}
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
          <Users className="h-4 w-4" />
          All Doctors
        </button>
        <button
          onClick={() => setTab("onboarding")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "onboarding"
              ? "bg-white text-[#1F3A6A] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitBranch className="h-4 w-4" />
          Onboarding Pipeline
        </button>
        <button
          onClick={() => setTab("email")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "email"
              ? "bg-white text-[#1F3A6A] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Bulk Email
        </button>
      </div>

      {activeTab === "onboarding" ? (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading pipeline...</div>}>
          <OnboardingPipeline />
        </Suspense>
      ) : activeTab === "email" ? (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading bulk email...</div>}>
          <BulkEmail />
        </Suspense>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, specialty..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pipeline">Pipeline</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All seniority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All seniority</SelectItem>
                  {skillLevels.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={specialityFilter} onValueChange={setSpecialityFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All specialities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specialities</SelectItem>
                  {specialities.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <BulkActionsToolbar
            selectedIds={selectedIds}
            onClear={() => setSelectedIds(new Set())}
            config={bulkConfig}
            totalCount={sortedDoctors.length}
          />

          {!isLoading && doctors.length === 0 && !search && statusFilter === "all" ? (
            <EmptyState
              icon={Stethoscope}
              title="No doctors yet"
              description="Add your first doctor to get started"
              actionLabel="Add Doctor"
              onAction={() => setShowAddDialog(true)}
            />
          ) : (
            <DataTable
              columns={columns}
              data={sortedDoctors}
              loading={isLoading}
              onRowClick={(doctor) => navigate(`/crm/doctors/${doctor.id}`)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getRowClassName={(doctor) => {
                const hasDocs = getUnverifiedDocCount(doctor.notes) > 0;
                const hasRefs = getUnverifiedRefCount(doctor.notes) > 0;
                if (hasDocs && hasRefs) return "bg-amber-50/60 border-l-2 border-l-red-400";
                if (hasDocs) return "bg-amber-50/60 border-l-2 border-l-amber-400";
                if (hasRefs) return "bg-blue-50/40 border-l-2 border-l-blue-400";
                return "";
              }}
            />
          )}

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Doctor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" name="full_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
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
                        <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                        <SelectItem value="deleted">Deleted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input id="specialty" name="specialty" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="app_downloaded" name="app_downloaded" className="rounded" />
                  <Label htmlFor="app_downloaded">App downloaded</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90" disabled={addDoctor.isPending}>
                    {addDoctor.isPending ? "Adding..." : "Add Doctor"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
