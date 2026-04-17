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
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  Sparkles,
  FileCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Doctor } from "../shared/types";

// ── Data hooks ───────────────────────────────────────────────────────

function useAllActiveDoctors() {
  return useQuery({
    queryKey: ["bulk-email-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .in("status", ["active", "pipeline"])
        .not("email", "is", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Doctor[];
    },
  });
}

function useDistinctSpecialities() {
  return useQuery({
    queryKey: ["bulk-email-specialities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("specialities");
      if (error) throw error;
      const all = data.flatMap((d) => d.specialities || []);
      return [...new Set(all)].filter(Boolean).sort();
    },
  });
}

function useDistinctSkillLevels() {
  return useQuery({
    queryKey: ["bulk-email-skill-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("skill_level")
        .not("skill_level", "is", null);
      if (error) throw error;
      return [...new Set(data.map((d) => d.skill_level).filter(Boolean))] as string[];
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
    name: "Job Opportunity",
    subject: "New Shift Opportunity — {{hospital}}, {{location}}",
    body: `Hi {{name}},

We have a new shift opportunity that matches your profile:

Hospital: {{hospital}}
Location: {{location}}
Date: {{date}}
Rate: {{rate}}/hr
Specialty: {{specialty}}
Skill Level: {{skill_level}}

If you're interested, please reply to this email or log into the StatDoctor app to apply.

Best regards,
StatDoctor Team`,
  },
  {
    name: "Document Reminder",
    subject: "Action Required: Please Upload Your Documents",
    body: `Hi {{name}},

We noticed your profile is missing some required documents. To be eligible for shifts, please upload the following:

- AHPRA registration
- Professional indemnity insurance
- CV / Resume
- Identification documents

You can upload these through the StatDoctor app or by replying to this email with attachments.

Best regards,
StatDoctor Team`,
  },
  {
    name: "Reference Reminder",
    subject: "Action Required: References Needed",
    body: `Hi {{name}},

To complete your onboarding, we need your professional references. Please provide at least two referee contacts.

You can submit these through the StatDoctor app or reply to this email with the details.

Best regards,
StatDoctor Team`,
  },
  {
    name: "General Update",
    subject: "StatDoctor Update",
    body: `Hi {{name}},

{{message}}

Best regards,
StatDoctor Team`,
  },
  {
    name: "Custom (Blank)",
    subject: "",
    body: "",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

function personalize(template: string, doctor: Doctor, vars: Record<string, string>): string {
  let result = template;
  result = result.replace(/\{\{name\}\}/g, doctor.full_name.split(" ")[0] || doctor.full_name);
  result = result.replace(/\{\{full_name\}\}/g, doctor.full_name);
  result = result.replace(/\{\{email\}\}/g, doctor.email || "");
  // Replace custom vars
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }
  return result;
}

// ── Recipient row ────────────────────────────────────────────────────

function RecipientRow({
  doctor,
  selected,
  onToggle,
}: {
  doctor: Doctor;
  selected: boolean;
  onToggle: () => void;
}) {
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
        <p className="truncate text-sm font-medium">{doctor.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{doctor.email}</p>
      </div>
      <div className="flex items-center gap-1">
        {doctor.skill_level && (
          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
            {doctor.skill_level}
          </span>
        )}
        <FileCheck
          className={`h-3.5 w-3.5 ${doctor.has_documents ? "text-green-500" : "text-gray-300"}`}
        />
        <ShieldCheck
          className={`h-3.5 w-3.5 ${doctor.ahpra_number ? "text-green-500" : "text-gray-300"}`}
        />
      </div>
    </label>
  );
}

// ── Preview modal ────────────────────────────────────────────────────

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
          <div className="whitespace-pre-wrap text-sm text-foreground">
            {body}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function BulkEmail() {
  // Filters
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [docsFilter, setDocsFilter] = useState("all");
  const [refsFilter, setRefsFilter] = useState("all");
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
    hospital: "",
    location: "",
    date: "",
    rate: "",
    specialty: "",
    skill_level: "",
    message: "",
  });

  // Data
  const { data: allDoctors = [], isLoading } = useAllActiveDoctors();
  const { data: specialities = [] } = useDistinctSpecialities();
  const { data: skillLevels = [] } = useDistinctSkillLevels();

  // Apply filters
  const filteredDoctors = useMemo(() => {
    let docs = allDoctors;

    if (specialtyFilter !== "all") {
      docs = docs.filter((d) =>
        (d.specialities || []).some((s) => s.toLowerCase() === specialtyFilter.toLowerCase())
      );
    }
    if (skillFilter !== "all") {
      docs = docs.filter((d) => d.skill_level === skillFilter);
    }
    if (docsFilter === "yes") {
      docs = docs.filter((d) => d.has_documents);
    } else if (docsFilter === "no") {
      docs = docs.filter((d) => !d.has_documents);
    }
    if (refsFilter === "yes") {
      docs = docs.filter((d) => d.has_references);
    } else if (refsFilter === "no") {
      docs = docs.filter((d) => !d.has_references);
    }
    if (recipientSearch) {
      const q = recipientSearch.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.full_name.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q)
      );
    }
    return docs;
  }, [allDoctors, specialtyFilter, skillFilter, docsFilter, refsFilter, recipientSearch]);

  // Selected doctors
  const selectedDoctors = filteredDoctors.filter((d) => selectedIds.has(d.id));
  const selectedEmails = selectedDoctors
    .map((d) => d.email)
    .filter(Boolean) as string[];

  // Template application
  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    const tmpl = TEMPLATES.find((t) => t.name === templateName);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  // Personalized preview (first selected doctor)
  const previewDoctor = selectedDoctors[0] || {
    full_name: "Dr. Example",
    email: "doctor@example.com",
  } as Doctor;
  const previewSubject = personalize(subject, previewDoctor, templateVars);
  const previewBody = personalize(body, previewDoctor, templateVars);

  // Select all visible
  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredDoctors.map((d) => d.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Actions
  const handleCopyEmails = () => {
    navigator.clipboard.writeText(selectedEmails.join(", "));
    toast.success(`Copied ${selectedEmails.length} email addresses`);
  };

  const handleOpenGmailCompose = () => {
    const subjectEncoded = encodeURIComponent(
      personalize(subject, previewDoctor, templateVars)
    );
    const bodyEncoded = encodeURIComponent(
      personalize(body, previewDoctor, templateVars)
    );
    const bcc = encodeURIComponent(selectedEmails.join(","));
    // Gmail compose URL supports longer content than mailto:
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${bcc}&su=${subjectEncoded}&body=${bodyEncoded}`;
    window.open(gmailUrl, "_blank");
    toast.success("Opened Gmail compose window");
  };

  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const [draftsCreated, setDraftsCreated] = useState(0);

  const handleCreateDrafts = async () => {
    if (selectedDoctors.length === 0 || !subject) return;
    setCreatingDrafts(true);
    setDraftsCreated(0);
    let success = 0;
    let failed = 0;

    for (const doctor of selectedDoctors) {
      const personalizedSubject = personalize(subject, doctor, templateVars);
      const personalizedBody = personalize(body, doctor, templateVars);

      try {
        const { error } = await supabase.from("emails").insert({
          gmail_id: `draft-bulk-${Date.now()}-${doctor.id}`,
          thread_id: `draft-thread-bulk-${Date.now()}-${doctor.id}`,
          subject: personalizedSubject,
          from_address: "me",
          from_name: "Me",
          to_addresses: [doctor.email],
          cc_addresses: [],
          date: new Date().toISOString(),
          labels: ["DRAFT"],
          body_text: personalizedBody,
          body_html: null,
          snippet: personalizedBody.slice(0, 100),
          is_read: true,
          has_attachments: false,
          contact_type: "doctor",
          contact_id: doctor.id,
          synced_at: new Date().toISOString(),
        });
        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
      setDraftsCreated(success + failed);
    }

    setCreatingDrafts(false);
    if (success > 0) {
      toast.success(`Created ${success} personalized draft${success !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`);
    } else {
      toast.error("Failed to create drafts");
    }
  };

  // Detect template variables in subject + body
  const usedVars = useMemo(() => {
    const combined = subject + body;
    const matches = combined.match(/\{\{(\w+)\}\}/g) || [];
    const vars = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
    // Exclude auto-filled ones
    return vars.filter((v) => !["name", "full_name", "email"].includes(v));
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
                {showFilters ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            {showFilters && (
              <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="All specialities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All specialities</SelectItem>
                      {specialities.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={skillFilter} onValueChange={setSkillFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="All skill levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All skill levels</SelectItem>
                      {skillLevels.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={docsFilter} onValueChange={setDocsFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="Documents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Documents: Any</SelectItem>
                      <SelectItem value="yes">Has documents</SelectItem>
                      <SelectItem value="no">Missing documents</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={refsFilter} onValueChange={setRefsFilter}>
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="References" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">References: Any</SelectItem>
                      <SelectItem value="yes">Has references</SelectItem>
                      <SelectItem value="no">Missing references</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(specialtyFilter !== "all" || skillFilter !== "all" || docsFilter !== "all" || refsFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSpecialtyFilter("all");
                      setSkillFilter("all");
                      setDocsFilter("all");
                      setRefsFilter("all");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search doctors..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>

            {/* Selection controls */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? "s" : ""} match
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

            {/* Recipient list */}
            <div
              className="space-y-1 overflow-y-auto pr-1"
              style={{ maxHeight: "calc(100vh - 520px)" }}
            >
              {isLoading ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Loading doctors...
                </p>
              ) : filteredDoctors.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No doctors match your filters
                </p>
              ) : (
                filteredDoctors.map((doc) => (
                  <RecipientRow
                    key={doc.id}
                    doctor={doc}
                    selected={selectedIds.has(doc.id)}
                    onToggle={() => {
                      const next = new Set(selectedIds);
                      if (next.has(doc.id)) {
                        next.delete(doc.id);
                      } else {
                        next.add(doc.id);
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
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  <SelectValue placeholder="Use template..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line..."
                className="text-sm"
              />
            </div>

            {/* Body */}
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

            {/* Template variables */}
            {usedVars.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Template Variables
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {usedVars.map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <Label className="w-24 text-right text-xs text-muted-foreground">
                        {`{{${v}}}`}
                      </Label>
                      <Input
                        value={templateVars[v] || ""}
                        onChange={(e) =>
                          setTemplateVars((prev) => ({
                            ...prev,
                            [v]: e.target.value,
                          }))
                        }
                        placeholder={v}
                        className="h-7 flex-1 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variable help */}
            <div className="text-[11px] text-muted-foreground">
              Available variables: <code className="rounded bg-gray-100 px-1">{"{{name}}"}</code>{" "}
              <code className="rounded bg-gray-100 px-1">{"{{full_name}}"}</code>{" "}
              <code className="rounded bg-gray-100 px-1">{"{{email}}"}</code>{" "}
              — auto-filled per recipient. Add custom ones like{" "}
              <code className="rounded bg-gray-100 px-1">{"{{hospital}}"}</code>{" "}
              <code className="rounded bg-gray-100 px-1">{"{{rate}}"}</code> and fill in above.
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && subject && (
          <PreviewPanel
            subject={previewSubject}
            body={previewBody}
            recipientCount={selectedEmails.length}
          />
        )}

        {/* Action buttons */}
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
            variant="outline"
            size="sm"
            onClick={handleCreateDrafts}
            disabled={selectedEmails.length === 0 || !subject || creatingDrafts}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {creatingDrafts
              ? `Creating ${draftsCreated}/${selectedDoctors.length}...`
              : `Create ${selectedEmails.length} Draft${selectedEmails.length !== 1 ? "s" : ""}`}
          </Button>

          <Button
            size="sm"
            className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
            onClick={handleOpenGmailCompose}
            disabled={selectedEmails.length === 0 || !subject}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Open in Gmail
          </Button>
        </div>
      </div>
    </div>
  );
}
