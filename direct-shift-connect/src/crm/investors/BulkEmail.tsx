import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Mail,
  Users,
  Filter,
  Copy,
  Send,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import type { Investor } from "../shared/types";

// ── Data hooks ───────────────────────────────────────────────────────

function parsePipeline(notes: string | null): { stage: string; detail: string } {
  if (!notes) return { stage: "-", detail: "" };
  const pipe = notes.indexOf(" | ");
  if (pipe === -1) return { stage: "-", detail: notes };
  return { stage: notes.slice(0, pipe), detail: notes.slice(pipe + 3) };
}

function parseCommitment(notes: string | null): number {
  if (!notes) return 0;
  const match = notes.match(/commitment:(\d+)/);
  return match ? Number(match[1]) : 0;
}

function useAllInvestors() {
  return useQuery({
    queryKey: ["bulk-email-investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .not("email", "is", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Investor[];
    },
  });
}

// ── Email templates ──────────────────────────────────────────────────

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    name: "Monthly Update",
    subject: "StatDoctor — {{month}} Investor Update",
    body: `Hi {{name}},

Here's your monthly update on StatDoctor for {{month}}:

{{update}}

Happy to jump on a call if you'd like to discuss anything.

Best regards,
Anurag
StatDoctor`,
  },
  {
    name: "Fundraise Announcement",
    subject: "StatDoctor — New Funding Round",
    body: `Hi {{name}},

I'm reaching out to share that StatDoctor is opening a new funding round.

{{details}}

If you're interested in participating or learning more, please reply to this email or book a call at your convenience.

Best regards,
Anurag
StatDoctor`,
  },
  {
    name: "Milestone Announcement",
    subject: "StatDoctor — Milestone Update",
    body: `Hi {{name}},

Exciting news — we've hit a key milestone at StatDoctor:

{{milestone}}

Thank you for your continued support.

Best regards,
Anurag
StatDoctor`,
  },
  {
    name: "Meeting Request",
    subject: "Catch Up — StatDoctor Progress",
    body: `Hi {{name}},

I'd love to schedule a catch-up to walk you through our latest progress at StatDoctor.

Are you available for a 30-minute call this week or next?

Best regards,
Anurag
StatDoctor`,
  },
  {
    name: "Custom (Blank)",
    subject: "",
    body: "",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

function personalize(template: string, investor: Investor, vars: Record<string, string>): string {
  let result = template;
  const firstName = investor.name.split(" ")[0] || investor.name;
  result = result.replace(/\{\{name\}\}/g, firstName);
  result = result.replace(/\{\{full_name\}\}/g, investor.name);
  result = result.replace(/\{\{company\}\}/g, investor.company || "");
  result = result.replace(/\{\{email\}\}/g, investor.email || "");
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }
  return result;
}

const PIPELINE_COLORS: Record<string, string> = {
  contacted: "bg-gray-100 text-gray-700",
  pitched: "bg-yellow-100 text-yellow-800",
  diligence: "bg-blue-100 text-blue-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-700",
};

// ── Recipient row ────────────────────────────────────────────────────

function RecipientRow({
  investor,
  selected,
  onToggle,
}: {
  investor: Investor;
  selected: boolean;
  onToggle: () => void;
}) {
  const { stage } = parsePipeline(investor.notes);
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
        selected
          ? "border-[#1F3A6A]/30 bg-[#1F3A6A]/5"
          : "border-transparent hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-4 w-4 rounded border-gray-300 text-[#1F3A6A] focus:ring-[#1F3A6A]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{investor.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {investor.email}
          {investor.company && ` · ${investor.company}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {stage !== "-" && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${PIPELINE_COLORS[stage] || "bg-gray-100 text-gray-600"}`}
          >
            {stage}
          </span>
        )}
        {(investor.investment_amount ?? 0) > 0 && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
            Deposited
          </span>
        )}
        {parseCommitment(investor.notes) > 0 && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            Committed
          </span>
        )}
      </div>
    </label>
  );
}

// ── Preview ──────────────────────────────────────────────────────────

function PreviewPanel({
  subject,
  body,
  recipientCount,
}: {
  subject: string;
  body: string;
  recipientCount: number;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          Preview (first recipient)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-1 text-xs text-muted-foreground">
            To: {recipientCount} recipient{recipientCount !== 1 ? "s" : ""} (BCC)
          </div>
          <div className="mb-3 border-b pb-2">
            <span className="text-xs text-muted-foreground">Subject: </span>
            <span className="text-sm font-semibold">{subject}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-foreground">{body}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function InvestorBulkEmail() {
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [investorTypeFilter, setInvestorTypeFilter] = useState("all");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Email compose
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Template variables
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({
    month: "",
    update: "",
    details: "",
    milestone: "",
  });

  // Data
  const { data: allInvestors = [], isLoading } = useAllInvestors();

  // Apply filters
  const filteredInvestors = useMemo(() => {
    let invs = allInvestors;

    if (statusFilter !== "all") {
      invs = invs.filter((i) => i.status === statusFilter);
    }
    if (pipelineFilter !== "all") {
      invs = invs.filter((i) => parsePipeline(i.notes).stage === pipelineFilter);
    }
    if (investorTypeFilter === "deposited") {
      invs = invs.filter((i) => (i.investment_amount ?? 0) > 0);
    } else if (investorTypeFilter === "committed") {
      invs = invs.filter((i) => parseCommitment(i.notes) > 0);
    } else if (investorTypeFilter === "active") {
      invs = invs.filter((i) => i.status === "active");
    } else if (investorTypeFilter === "lost") {
      invs = invs.filter((i) => i.status === "cold" || parsePipeline(i.notes).stage === "lost");
    }
    if (recipientSearch) {
      const q = recipientSearch.toLowerCase();
      invs = invs.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.email?.toLowerCase().includes(q) ||
          i.company?.toLowerCase().includes(q)
      );
    }
    return invs;
  }, [allInvestors, statusFilter, pipelineFilter, investorTypeFilter, recipientSearch]);

  const selectedInvestors = filteredInvestors.filter((i) => selectedIds.has(i.id));
  const selectedEmails = selectedInvestors
    .map((i) => i.email)
    .filter(Boolean) as string[];

  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    const tmpl = TEMPLATES.find((t) => t.name === templateName);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const previewInvestor = selectedInvestors[0] || {
    name: "Example Investor",
    email: "investor@example.com",
    company: "Example Fund",
  } as Investor;
  const previewSubject = personalize(subject, previewInvestor, templateVars);
  const previewBody = personalize(body, previewInvestor, templateVars);

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredInvestors.map((i) => i.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleCopyEmails = () => {
    navigator.clipboard.writeText(selectedEmails.join(", "));
    toast.success(`Copied ${selectedEmails.length} email addresses`);
  };

  const handleOpenMailto = () => {
    const subjectEncoded = encodeURIComponent(
      personalize(subject, previewInvestor, templateVars)
    );
    const bodyEncoded = encodeURIComponent(
      personalize(body, previewInvestor, templateVars)
    );
    const mailto = `mailto:?bcc=${encodeURIComponent(selectedEmails.join(","))}&subject=${subjectEncoded}&body=${bodyEncoded}`;
    window.location.href = mailto;
    toast.success("Opened in email client");
  };

  const usedVars = useMemo(() => {
    const combined = subject + body;
    const matches = combined.match(/\{\{(\w+)\}\}/g) || [];
    const vars = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
    return vars.filter((v) => !["name", "full_name", "company", "email"].includes(v));
  }, [subject, body]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Recipients */}
      <div className="lg:col-span-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-[#1F3A6A]" />
                Recipients
              </CardTitle>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cold">Cold / Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="pitched">Pitched</SelectItem>
                      <SelectItem value="diligence">Diligence</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={investorTypeFilter} onValueChange={setInvestorTypeFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs col-span-2">
                      <SelectValue placeholder="Investor type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All investors</SelectItem>
                      <SelectItem value="deposited">Actual investors (deposited)</SelectItem>
                      <SelectItem value="committed">Verbal commitments</SelectItem>
                      <SelectItem value="active">Active investors</SelectItem>
                      <SelectItem value="lost">Lost / Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(statusFilter !== "all" || pipelineFilter !== "all" || investorTypeFilter !== "all") && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setPipelineFilter("all");
                      setInvestorTypeFilter("all");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {filteredInvestors.length} investor{filteredInvestors.length !== 1 ? "s" : ""} match
                {selectedIds.size > 0 && (
                  <span className="ml-1 font-semibold text-[#1F3A6A]">
                    · {selectedIds.size} selected
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAllVisible}
                  className="text-xs font-medium text-[#1F3A6A] hover:underline"
                >
                  Select all
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div
              className="space-y-1 overflow-y-auto pr-1"
              style={{ maxHeight: "calc(100vh - 520px)" }}
            >
              {isLoading ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Loading investors...</p>
              ) : filteredInvestors.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No investors match your filters</p>
              ) : (
                filteredInvestors.map((inv) => (
                  <RecipientRow
                    key={inv.id}
                    investor={inv}
                    selected={selectedIds.has(inv.id)}
                    onToggle={() => {
                      const next = new Set(selectedIds);
                      if (next.has(inv.id)) {
                        next.delete(inv.id);
                      } else {
                        next.add(inv.id);
                      }
                      setSelectedIds(next);
                    }}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Compose */}
      <div className="lg:col-span-7 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-[#1F3A6A]" />
                Compose Email
              </CardTitle>
              <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  <SelectValue placeholder="Use template..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here..."
                rows={12}
                className="text-sm font-mono"
              />
            </div>

            {usedVars.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Template Variables</p>
                <div className="grid grid-cols-2 gap-2">
                  {usedVars.map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <Label className="w-24 text-right text-xs text-muted-foreground">{`{{${v}}}`}</Label>
                      <Input
                        value={templateVars[v] || ""}
                        onChange={(e) =>
                          setTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        placeholder={v}
                        className="h-7 flex-1 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-muted-foreground">
              Available variables: <code className="rounded bg-gray-100 px-1">{"{{name}}"}</code>{" "}
              <code className="rounded bg-gray-100 px-1">{"{{full_name}}"}</code>{" "}
              <code className="rounded bg-gray-100 px-1">{"{{company}}"}</code>{" "}
              <code className="rounded bg-gray-100 px-1">{"{{email}}"}</code>{" "}
              — auto-filled per recipient.
            </div>
          </CardContent>
        </Card>

        {showPreview && subject && (
          <PreviewPanel
            subject={previewSubject}
            body={previewBody}
            recipientCount={selectedEmails.length}
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!subject && !body}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>

          <div className="flex-1" />

          <span className="text-xs text-muted-foreground">
            {selectedEmails.length} recipient{selectedEmails.length !== 1 ? "s" : ""}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyEmails}
            disabled={selectedEmails.length === 0}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy Emails
          </Button>

          <Button
            size="sm"
            className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
            onClick={handleOpenMailto}
            disabled={selectedEmails.length === 0 || !subject}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Open in Email Client
          </Button>
        </div>
      </div>
    </div>
  );
}
