import { useState, lazy, Suspense, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import { DataTable, Column } from "../shared/components/DataTable";
import { BulkActionsToolbar, downloadCSV } from "../shared/components/BulkActionsToolbar";
import { EmptyState } from "../shared/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Search, FileText, Mail, DollarSign, Handshake, Pencil, Plus, X, Check } from "lucide-react";

const InvestorBulkEmail = lazy(() => import("./BulkEmail"));
import { toast } from "sonner";
import type { Investor, InvestorStatus } from "../shared/types";

// Extract pipeline stage from notes field (format: "stage | notes")
function parsePipeline(notes: string | null): { stage: string; detail: string } {
  if (!notes) return { stage: "-", detail: "" };
  const pipe = notes.indexOf(" | ");
  if (pipe === -1) return { stage: "-", detail: notes };
  return { stage: notes.slice(0, pipe), detail: notes.slice(pipe + 3) };
}

// Parse commitment amount from notes (format: "stage | commitment:AMOUNT | notes")
function parseCommitment(notes: string | null): number {
  if (!notes) return 0;
  const match = notes.match(/commitment:(\d+)/);
  return match ? Number(match[1]) : 0;
}

function setCommitmentInNotes(notes: string | null, amount: number): string {
  if (!notes) return `pending | commitment:${amount} |`;
  if (notes.includes("commitment:")) {
    return notes.replace(/commitment:\d+/, `commitment:${amount}`);
  }
  // Insert commitment after pipeline stage
  const pipe = notes.indexOf(" | ");
  if (pipe === -1) return `${notes} | commitment:${amount} |`;
  return `${notes.slice(0, pipe + 3)}commitment:${amount} | ${notes.slice(pipe + 3)}`;
}

function removeCommitmentFromNotes(notes: string | null): string {
  if (!notes) return "";
  return notes.replace(/commitment:\d+\s*\|?\s*/g, "").replace(/\|\s*\|/g, "|").replace(/\|\s*$/, "").trim();
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `$${amount.toLocaleString()}`;
}

// Inline editable amount cell
function EditableAmount({
  value,
  onSave,
}: {
  value: number;
  onSave: (newVal: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const save = () => {
    const parsed = parseFloat(draft.replace(/[,$\s]/g, ""));
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">$</span>
        <input
          ref={inputRef}
          type="text"
          className="w-24 rounded border px-2 py-0.5 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={save}
        />
      </div>
    );
  }

  return (
    <button
      className="group flex items-center gap-1 text-sm font-semibold hover:text-[#1F3A6A] transition-colors"
      onClick={startEdit}
      title="Click to edit"
    >
      {formatCurrency(value)}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}

const PIPELINE_COLORS: Record<string, string> = {
  contacted: "bg-gray-100 text-gray-700",
  pitched: "bg-yellow-100 text-yellow-800",
  diligence: "bg-blue-100 text-blue-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-700",
};

function PipelineBadge({ stage }: { stage: string }) {
  const colors = PIPELINE_COLORS[stage] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors}`}>
      {stage}
    </span>
  );
}

function useInvestors(search: string, statusFilter: string) {
  return useQuery({
    queryKey: ["investors", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("investors")
        .select("*")
        .order("name", { ascending: true });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Investor[];
    },
  });
}

function useInvestorReports() {
  return useQuery({
    queryKey: ["investor-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

const investorColumns: Column<Investor>[] = [
  {
    key: "name",
    header: "Investor",
    render: (row) => (
      <div>
        <div className="font-medium">{row.name}</div>
        {row.company && <div className="text-xs text-muted-foreground">{row.company}</div>}
      </div>
    ),
  },
  {
    key: "email",
    header: "Contact Email",
    render: (row) => row.email ? <span className="text-sm">{row.email}</span> : "-",
  },
  {
    key: "notes" as keyof Investor,
    header: "Pipeline",
    render: (row) => {
      const { stage } = parsePipeline(row.notes);
      return <PipelineBadge stage={stage} />;
    },
  },
  {
    key: "investment_amount",
    header: "Deposited",
    render: (row) => {
      const amount = row.investment_amount ?? 0;
      return amount > 0 ? (
        <span className="text-sm font-medium text-green-700">{formatCurrency(amount)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    key: "updated_at" as keyof Investor,
    header: "Committed",
    render: (row) => {
      const amount = parseCommitment(row.notes);
      return amount > 0 ? (
        <span className="text-sm font-medium text-blue-700">{formatCurrency(amount)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    key: "created_at",
    header: "Added",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

function InvestorsList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: investors = [], isLoading } = useInvestors(search, statusFilter);

  const investorMap = new Map(investors.map((i) => [i.id, i]));

  const bulkConfig = {
    entityName: "investor",
    statuses: [
      { value: "active", label: "Active" },
      { value: "pending", label: "Pending" },
      { value: "cold", label: "Cold / Lost" },
    ],
    onStatusChange: async (ids: string[], status: string) => {
      const { error } = await supabase
        .from("investors")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast.success(`${ids.length} investor${ids.length !== 1 ? "s" : ""} updated to ${status}`);
    },
    onExport: (ids: string[]) => {
      const rows = (ids.length > 0 ? ids.map((id) => investorMap.get(id)).filter(Boolean) : investors) as Investor[];
      downloadCSV(
        `investors-export-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Name", "Company", "Email", "Phone", "Status", "Pipeline Stage", "Invested", "Notes", "Added"],
        rows.map((i) => {
          const { stage, detail } = parsePipeline(i.notes);
          return [
            i.name,
            i.company || "",
            i.email || "",
            i.phone || "",
            i.status,
            stage,
            (i.investment_amount ?? 0) > 0 ? "Yes" : "No",
            detail,
            i.created_at?.slice(0, 10) || "",
          ];
        })
      );
      toast.success(`Exported ${rows.length} investor${rows.length !== 1 ? "s" : ""}`);
    },
    getEmail: (id: string) => investorMap.get(id)?.email || null,
    getName: (id: string) => investorMap.get(id)?.name || "",
    showEmail: true,
    showDelete: false,
  };

  const addInvestor = useMutation({
    mutationFn: async (investor: Partial<Investor>) => {
      const { data, error } = await supabase.from("investors").insert(investor).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setShowAddDialog(false);
      toast.success("Investor added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateInvestor = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Investor> }) => {
      const { error } = await supabase
        .from("investors")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    },
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pipeline = form.get("pipeline") as string || "contacted";
    const notes = form.get("notes") as string || "";
    addInvestor.mutate({
      name: form.get("name") as string,
      company: (form.get("company") as string) || null,
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      status: (form.get("status") as InvestorStatus) || "pending",
      notes: `${pipeline} | ${notes}`,
    });
  };

  // Fundraising data
  const depositors = investors.filter((i) => (i.investment_amount ?? 0) > 0);
  const totalDeposited = depositors.reduce((s, i) => s + (i.investment_amount ?? 0), 0);
  const commitments = investors.filter((i) => parseCommitment(i.notes) > 0);
  const totalCommitted = commitments.reduce((s, i) => s + parseCommitment(i.notes), 0);

  const pipelineCount = {
    contacted: investors.filter((i) => parsePipeline(i.notes).stage === "contacted").length,
    pitched: investors.filter((i) => parsePipeline(i.notes).stage === "pitched").length,
    won: investors.filter((i) => parsePipeline(i.notes).stage === "won").length,
    lost: investors.filter((i) => parsePipeline(i.notes).stage === "lost").length,
  };

  // State for adding new entries
  const [addingDeposit, setAddingDeposit] = useState(false);
  const [addingCommitment, setAddingCommitment] = useState(false);
  const [newDepositName, setNewDepositName] = useState("");
  const [newDepositAmount, setNewDepositAmount] = useState("");
  const [newCommitmentName, setNewCommitmentName] = useState("");
  const [newCommitmentAmount, setNewCommitmentAmount] = useState("");

  // Get non-depositors for dropdown
  const nonDepositors = investors.filter((i) => (i.investment_amount ?? 0) === 0);
  const nonCommitters = investors.filter((i) => parseCommitment(i.notes) === 0);

  const handleAddDeposit = () => {
    const inv = investors.find((i) => i.id === newDepositName);
    const amount = parseFloat(newDepositAmount.replace(/[,$\s]/g, ""));
    if (!inv || isNaN(amount) || amount <= 0) return;
    updateInvestor.mutate(
      { id: inv.id, data: { investment_amount: amount } },
      {
        onSuccess: () => {
          toast.success(`${inv.name} added as deposit — ${formatCurrency(amount)}`);
          setAddingDeposit(false);
          setNewDepositName("");
          setNewDepositAmount("");
        },
      }
    );
  };

  const handleAddCommitment = () => {
    const inv = investors.find((i) => i.id === newCommitmentName);
    const amount = parseFloat(newCommitmentAmount.replace(/[,$\s]/g, ""));
    if (!inv || isNaN(amount) || amount <= 0) return;
    const newNotes = setCommitmentInNotes(inv.notes, amount);
    updateInvestor.mutate(
      { id: inv.id, data: { notes: newNotes } as any },
      {
        onSuccess: () => {
          toast.success(`${inv.name} added as commitment — ${formatCurrency(amount)}`);
          setAddingCommitment(false);
          setNewCommitmentName("");
          setNewCommitmentAmount("");
        },
      }
    );
  };

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-[#1F3A6A]">{investors.length}</div>
            <p className="text-xs text-muted-foreground">Total Investors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposited)}</div>
            <p className="text-xs text-muted-foreground">Actual Deposits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">Verbal Commitments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalDeposited + totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">Total Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Fundraising Tracker */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Actual Deposits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Actual Deposits
              </span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(totalDeposited)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {depositors.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 group">
                  <span className="text-sm font-medium">{inv.name}</span>
                  <div className="flex items-center gap-2">
                    <EditableAmount
                      value={inv.investment_amount ?? 0}
                      onSave={(amount) =>
                        updateInvestor.mutate(
                          { id: inv.id, data: { investment_amount: amount } },
                          { onSuccess: () => toast.success(`Updated ${inv.name} deposit to ${formatCurrency(amount)}`) }
                        )
                      }
                    />
                    <button
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-500 transition-opacity"
                      onClick={() =>
                        updateInvestor.mutate(
                          { id: inv.id, data: { investment_amount: 0 } },
                          { onSuccess: () => toast.success(`Removed ${inv.name} from deposits`) }
                        )
                      }
                      title="Remove from deposits"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {depositors.length === 0 && !addingDeposit && (
                <p className="text-sm text-muted-foreground py-2">No deposits yet</p>
              )}

              {addingDeposit ? (
                <div className="flex items-center gap-2 mt-2 rounded-md border p-2">
                  <select
                    className="flex-1 rounded border px-2 py-1 text-sm bg-background"
                    value={newDepositName}
                    onChange={(e) => setNewDepositName(e.target.value)}
                  >
                    <option value="">Select investor...</option>
                    {nonDepositors.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="text"
                      placeholder="Amount"
                      className="w-24 rounded border px-2 py-1 text-sm"
                      value={newDepositAmount}
                      onChange={(e) => setNewDepositAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDeposit()}
                    />
                  </div>
                  <button className="text-green-600 hover:text-green-700" onClick={handleAddDeposit}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => setAddingDeposit(false)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
                  onClick={() => setAddingDeposit(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add deposit
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verbal Commitments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-blue-600" />
                Verbal Commitments
              </span>
              <span className="text-sm font-bold text-blue-600">{formatCurrency(totalCommitted)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {commitments.map((inv) => {
                const commitAmt = parseCommitment(inv.notes);
                const { detail } = parsePipeline(inv.notes);
                const cleanDetail = detail.replace(/commitment:\d+\s*\|?\s*/g, "").trim();
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 group">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{inv.name}</span>
                      {cleanDetail && <span className="text-xs text-muted-foreground ml-2">({cleanDetail})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <EditableAmount
                        value={commitAmt}
                        onSave={(amount) => {
                          const newNotes = setCommitmentInNotes(inv.notes, amount);
                          updateInvestor.mutate(
                            { id: inv.id, data: { notes: newNotes } as any },
                            { onSuccess: () => toast.success(`Updated ${inv.name} commitment to ${formatCurrency(amount)}`) }
                          );
                        }}
                      />
                      <button
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-500 transition-opacity"
                        onClick={() => {
                          const newNotes = removeCommitmentFromNotes(inv.notes);
                          updateInvestor.mutate(
                            { id: inv.id, data: { notes: newNotes } as any },
                            { onSuccess: () => toast.success(`Removed ${inv.name} from commitments`) }
                          );
                        }}
                        title="Remove from commitments"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {commitments.length === 0 && !addingCommitment && (
                <p className="text-sm text-muted-foreground py-2">No verbal commitments yet</p>
              )}

              {addingCommitment ? (
                <div className="flex items-center gap-2 mt-2 rounded-md border p-2">
                  <select
                    className="flex-1 rounded border px-2 py-1 text-sm bg-background"
                    value={newCommitmentName}
                    onChange={(e) => setNewCommitmentName(e.target.value)}
                  >
                    <option value="">Select investor...</option>
                    {nonCommitters.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="text"
                      placeholder="Amount"
                      className="w-24 rounded border px-2 py-1 text-sm"
                      value={newCommitmentAmount}
                      onChange={(e) => setNewCommitmentAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCommitment()}
                    />
                  </div>
                  <button className="text-green-600 hover:text-green-700" onClick={handleAddCommitment}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => setAddingCommitment(false)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
                  onClick={() => setAddingCommitment(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add commitment
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, contact..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cold">Cold / Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionsToolbar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds(new Set())}
        config={bulkConfig}
        totalCount={investors.length}
      />

      {!isLoading && investors.length === 0 && !search && statusFilter === "all" ? (
        <EmptyState
          icon={TrendingUp}
          title="No investors yet"
          description="Add your first investor to get started"
          actionLabel="Add Investor"
          onAction={() => setShowAddDialog(true)}
        />
      ) : (
        <DataTable<Investor>
          columns={investorColumns}
          data={investors}
          loading={isLoading}
          onRowClick={(inv) => setSelectedInvestor(inv)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Investor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name / Company *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Partner Name</Label>
                <Input id="company" name="company" />
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
                <Label htmlFor="pipeline">Pipeline Stage</Label>
                <Select name="pipeline" defaultValue="contacted">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="pitched">Pitched</SelectItem>
                    <SelectItem value="diligence">Diligence</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="pending">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button type="submit" className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90" disabled={addInvestor.isPending}>
                {addInvestor.isPending ? "Adding..." : "Add Investor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Investor detail/edit dialog */}
      <InvestorEditDialog
        investor={selectedInvestor}
        onClose={() => setSelectedInvestor(null)}
        onSave={(id, data) => {
          updateInvestor.mutate(
            { id, data },
            {
              onSuccess: () => {
                toast.success("Investor updated");
                setSelectedInvestor(null);
              },
            }
          );
        }}
      />
    </>
  );
}

function InvestorEditDialog({
  investor,
  onClose,
  onSave,
}: {
  investor: Investor | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<Investor>) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "pending" as InvestorStatus,
    pipeline: "contacted",
    investment_amount: "",
    commitment_amount: "",
    detail: "",
  });

  useEffect(() => {
    if (investor) {
      const { stage, detail } = parsePipeline(investor.notes);
      const commitment = parseCommitment(investor.notes);
      const cleanDetail = detail.replace(/commitment:\d+\s*\|?\s*/g, "").trim();
      setForm({
        name: investor.name || "",
        company: investor.company || "",
        email: investor.email || "",
        phone: investor.phone || "",
        status: investor.status || "pending",
        pipeline: stage === "-" ? "contacted" : stage,
        investment_amount: (investor.investment_amount ?? 0) > 0 ? String(investor.investment_amount) : "",
        commitment_amount: commitment > 0 ? String(commitment) : "",
        detail: cleanDetail,
      });
    }
  }, [investor]);

  const handleSave = () => {
    if (!investor) return;
    let notes = form.pipeline;
    if (form.commitment_amount) {
      notes += ` | commitment:${parseFloat(form.commitment_amount.replace(/[,$\s]/g, "")) || 0}`;
    }
    if (form.detail) {
      notes += ` | ${form.detail}`;
    } else {
      notes += " |";
    }

    onSave(investor.id, {
      name: form.name,
      company: form.company || null,
      email: form.email || null,
      phone: form.phone || null,
      status: form.status,
      investment_amount: form.investment_amount ? parseFloat(form.investment_amount.replace(/[,$\s]/g, "")) || 0 : 0,
      notes,
    });
  };

  return (
    <Dialog open={!!investor} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        {investor && (
          <>
            <DialogHeader>
              <DialogTitle>Edit Investor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <Select value={form.pipeline} onValueChange={(v) => setForm({ ...form, pipeline: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="pitched">Pitched</SelectItem>
                      <SelectItem value="diligence">Diligence</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as InvestorStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cold">Cold / Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount Deposited ($)</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={form.investment_amount}
                    onChange={(e) => setForm({ ...form, investment_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verbal Commitment ($)</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={form.commitment_amount}
                    onChange={(e) => setForm({ ...form, commitment_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvestorUpdates() {
  const { data: reports = [], isLoading } = useInvestorReports();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading updates...</p>;
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No investor updates yet"
        description="Monthly investor updates will appear here"
      />
    );
  }

  return (
    <div className="space-y-6">
      {reports.map((report: any) => {
        let content: any = {};
        try {
          content = typeof report.content === "string" ? JSON.parse(report.content) : report.content;
        } catch { /* ignore */ }

        const month = content.month
          ? new Date(content.month + "-01").toLocaleDateString("en-AU", { month: "long", year: "numeric" })
          : "";

        return (
          <Card key={report.id}>
            <CardHeader className="pb-3">
              <div className="text-center">
                <CardTitle className="text-lg">{report.title}</CardTitle>
                {month && <p className="text-sm text-muted-foreground">{month}</p>}
              </div>
              <div className="mx-auto mt-2 h-px w-3/4 bg-border" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Updates */}
              <div>
                <h3 className="text-base font-bold mb-3">Key Updates</h3>

                {content.fundraising && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-1">Fundraising</h4>
                    <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                      {content.fundraising.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.productSales && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-1">Product/Sales</h4>
                    <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                      {content.productSales.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.focusThisMonth && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-1">Focus this Month</h4>
                    <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                      {content.focusThisMonth.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Metrics table */}
              {content.metrics && (
                <div>
                  <h3 className="text-base font-bold mb-3">Metrics</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {content.metrics.headers.map((h: string, i: number) => (
                            <th key={i} className="pb-2 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {content.metrics.rows.map((row: string[], i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            {row.map((cell: string, j: number) => (
                              <td key={j} className="py-2 text-muted-foreground">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Monthly Targets */}
              {content.monthlyTargets && (
                <div>
                  <h3 className="text-base font-bold mb-3">Monthly Targets</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {content.monthlyTargets.headers.map((h: string, i: number) => (
                            <th key={i} className="pb-2 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {content.monthlyTargets.rows.map((row: string[], i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            {row.map((cell: string, j: number) => (
                              <td key={j} className="py-2 text-muted-foreground">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function InvestorsPage() {
  const [activeTab, setActiveTab] = useState("investors");
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div>
      <PageHeader
        title="Investors"
        description="Manage investor relations and track updates"
        actionLabel="Add Investor"
        onAction={() => setShowAddDialog(true)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="updates">Investor Updates</TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Bulk Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="mt-4">
          <InvestorsList />
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <InvestorUpdates />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading bulk email...</div>}>
            <InvestorBulkEmail />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
