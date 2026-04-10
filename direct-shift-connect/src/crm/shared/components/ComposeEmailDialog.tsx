import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Pencil, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "../logActivity";

interface Recipient {
  name: string;
  email: string;
  entityId?: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  defaultSubject?: string;
  defaultBody?: string;
}

interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
  isDefault?: boolean;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    label: "Welcome Pack",
    subject: "Welcome to StatDoctor – Getting Started",
    body: `Hi {{name}},

Thank you for joining StatDoctor! We're excited to have you on board.

StatDoctor connects hospitals directly with locum doctors — no agencies, no middlemen. Here's how to get started:

1. Download our app (iOS & Android)
2. Post your available shifts
3. Doctors apply directly to you

If you have any questions, feel free to reach out anytime.

Best regards,
The StatDoctor Team`,
    isDefault: true,
  },
  {
    id: "followup",
    label: "Follow Up",
    subject: "Following up – StatDoctor",
    body: `Hi {{name}},

I wanted to follow up on our previous conversation about StatDoctor.

Have you had a chance to review the platform? I'd love to help you get set up and answer any questions.

Would you be available for a quick call this week?

Best regards,
The StatDoctor Team`,
    isDefault: true,
  },
  {
    id: "shifts",
    label: "Shift Posting Reminder",
    subject: "Ready to post your first shift?",
    body: `Hi {{name}},

I noticed you haven't posted any shifts yet on StatDoctor. Getting started is simple:

1. Log into the app or dashboard
2. Click "Post a Shift"
3. Fill in the details (date, specialty, rate)
4. Doctors in your area will be notified instantly

We have over 200 doctors across Australia ready to pick up shifts. Let me know if you need any help!

Best regards,
The StatDoctor Team`,
    isDefault: true,
  },
  {
    id: "intro",
    label: "Cold Outreach",
    subject: "Locum staffing made simple – StatDoctor",
    body: `Hi {{name}},

I'm reaching out from StatDoctor — we help hospitals fill locum shifts directly with qualified doctors, cutting out recruitment agencies entirely.

Here's what makes us different:
- No agency fees or commissions
- Doctors apply directly to your shifts
- Real-time notifications & instant booking
- 200+ verified doctors across Australia

Would you be open to a quick 10-minute call this week to see if we could help your team?

Best regards,
The StatDoctor Team`,
    isDefault: true,
  },
  {
    id: "custom",
    label: "Custom Email",
    subject: "",
    body: "",
    isDefault: true,
  },
];

const STORAGE_KEY = "statdoctor-email-templates";

function loadTemplates(): EmailTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as EmailTemplate[];
      // Always ensure "custom" template exists at the end
      if (!parsed.find((t) => t.id === "custom")) {
        parsed.push({ id: "custom", label: "Custom Email", subject: "", body: "" });
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_TEMPLATES;
}

function saveTemplates(templates: EmailTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recipients,
  defaultSubject = "",
  defaultBody = "",
}: ComposeEmailDialogProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [template, setTemplate] = useState("custom");
  const [templates, setTemplates] = useState<EmailTemplate[]>(loadTemplates);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const isBulk = recipients.length > 1;

  // Reload templates when dialog opens
  useEffect(() => {
    if (open) {
      setTemplates(loadTemplates());
    }
  }, [open]);

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl && templateId !== "custom") {
      setSubject(tmpl.subject);
      if (recipients.length === 1) {
        const firstName = recipients[0].name?.split(" ")[0] || "there";
        setBody(tmpl.body.replace(/\{\{name\}\}/g, firstName));
      } else {
        setBody(tmpl.body.replace(/\{\{name\}\}/g, "there"));
      }
    }
  };

  const handleSend = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter a message body");
      return;
    }

    const emails = recipients.map((r) => r.email).filter(Boolean);

    if (emails.length === 0) {
      toast.error("No email addresses found for selected hospitals");
      return;
    }

    if (isBulk) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&bcc=${encodeURIComponent(emails.join(","))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, "_blank");
    } else {
      const recipientEmail = emails[0];
      const recipientName = recipients[0].name || "";
      const personalizedBody = body.replace(/\{\{name\}\}/g, recipientName.split(" ")[0] || "there");
      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalizedBody)}`;
      window.open(gmailUrl, "_blank");
    }

    for (const r of recipients) {
      if (r.entityId) {
        logActivity({
          module: "hospitals",
          entityId: r.entityId,
          action: "email_sent",
          summary: `Emailed ${r.name || r.email}: "${subject}"`,
          metadata: { to: r.email, subject },
        });
      }
    }

    toast.success(
      isBulk
        ? `Gmail compose opened for ${emails.length} hospitals`
        : `Gmail compose opened for ${recipients[0].name || recipients[0].email}`
    );

    onOpenChange(false);
    setSubject("");
    setBody("");
    setTemplate("custom");
  };

  // ── Template Manager ────────────────────────────────────────────

  const startEditTemplate = (tmpl: EmailTemplate) => {
    setEditingTemplate(tmpl.id);
    setEditLabel(tmpl.label);
    setEditSubject(tmpl.subject);
    setEditBody(tmpl.body);
  };

  const saveEditTemplate = () => {
    if (!editingTemplate) return;
    if (!editLabel.trim()) {
      toast.error("Template name is required");
      return;
    }

    const updated = templates.map((t) =>
      t.id === editingTemplate
        ? { ...t, label: editLabel.trim(), subject: editSubject, body: editBody }
        : t
    );
    setTemplates(updated);
    saveTemplates(updated);
    setEditingTemplate(null);
    toast.success("Template saved");
  };

  const addNewTemplate = () => {
    const newId = `custom-${Date.now()}`;
    const newTemplate: EmailTemplate = {
      id: newId,
      label: "New Template",
      subject: "",
      body: `Hi {{name}},\n\n\n\nBest regards,\nThe StatDoctor Team`,
    };
    // Insert before "custom" (which is always last)
    const customIdx = templates.findIndex((t) => t.id === "custom");
    const updated = [...templates];
    if (customIdx >= 0) {
      updated.splice(customIdx, 0, newTemplate);
    } else {
      updated.push(newTemplate);
    }
    setTemplates(updated);
    saveTemplates(updated);
    startEditTemplate(newTemplate);
  };

  const deleteTemplate = (id: string) => {
    if (id === "custom") return; // can't delete custom
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    if (editingTemplate === id) setEditingTemplate(null);
    toast.success("Template deleted");
  };

  const resetToDefaults = () => {
    setTemplates(DEFAULT_TEMPLATES);
    saveTemplates(DEFAULT_TEMPLATES);
    setEditingTemplate(null);
    toast.success("Templates reset to defaults");
  };

  // ── Template Manager View ───────────────────────────────────────

  if (showTemplateManager) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#1F3A6A]" />
              Manage Email Templates
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto -mx-6 px-6 space-y-2">
            {templates
              .filter((t) => t.id !== "custom")
              .map((tmpl) => (
                <div key={tmpl.id}>
                  {editingTemplate === tmpl.id ? (
                    /* ── Editing Mode ── */
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Template Name</Label>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="e.g. Follow Up After Demo"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Subject Line</Label>
                        <Input
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          placeholder="Email subject..."
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Body <span className="text-[10px] text-muted-foreground/70 ml-1">Use {"{{name}}"} for personalization</span>
                        </Label>
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                          <X className="mr-1 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEditTemplate} className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90">
                          <Save className="mr-1 h-3.5 w-3.5" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display Mode ── */
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{tmpl.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{tmpl.subject || "No subject"}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditTemplate(tmpl)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteTemplate(tmpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          <DialogFooter className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addNewTemplate}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Template
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={resetToDefaults}>
                Reset to Defaults
              </Button>
            </div>
            <Button onClick={() => setShowTemplateManager(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Compose View ────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#1F3A6A]" />
            {isBulk ? `Email ${recipients.length} Hospitals` : `Email ${recipients[0]?.name || "Hospital"}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {isBulk ? "Recipients (BCC)" : "To"}
            </Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border bg-gray-50 p-2 max-h-24 overflow-y-auto">
              {recipients.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1F3A6A]/10 px-2.5 py-0.5 text-xs font-medium text-[#1F3A6A]"
                >
                  {r.name || r.email}
                  {r.email && <span className="text-[10px] text-muted-foreground ml-0.5">{r.email}</span>}
                </span>
              ))}
              {recipients.some((r) => !r.email) && (
                <span className="text-[10px] text-amber-600 self-center">
                  ({recipients.filter((r) => !r.email).length} missing email)
                </span>
              )}
            </div>
          </div>

          {/* Template picker */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Template</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-[#1F3A6A]"
                onClick={() => setShowTemplateManager(true)}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit Templates
              </Button>
            </div>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90"
            disabled={!subject.trim() || !body.trim() || recipients.filter((r) => r.email).length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Open in Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
