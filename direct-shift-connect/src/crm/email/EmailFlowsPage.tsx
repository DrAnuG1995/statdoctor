import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Mail, Clock, Trash2, ChevronDown, ChevronUp, ArrowDown, Play, Pause,
  Copy, Pencil, Send, Eye, GripVertical, Zap, Users, Building2, Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────

interface FlowStep {
  id: string;
  type: "email" | "delay";
  subject?: string;
  body?: string;
  delayDays?: number;
}

interface EmailFlow {
  id: string;
  name: string;
  description: string;
  audience: "hospitals" | "doctors" | "investors";
  status: "draft" | "active" | "paused";
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

// DB row → component type
function dbToFlow(row: Record<string, unknown>): EmailFlow {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || "",
    audience: row.audience as EmailFlow["audience"],
    status: row.status as EmailFlow["status"],
    steps: (row.steps as FlowStep[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Brand HTML wrapper ─────────────────────────────────────────────────

function brandedEmailPreview(subject: string, body: string, recipientName = "{{name}}") {
  const processedBody = body.replace(/\{\{name\}\}/g, recipientName);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F5F7; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1F3A6A; padding: 32px 40px; text-align: center; }
    .header img { height: 32px; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 600; margin: 12px 0 0; letter-spacing: -0.3px; }
    .body { padding: 40px; color: #1E293B; font-size: 15px; line-height: 1.7; }
    .body p { margin: 0 0 16px; }
    .cta-btn { display: inline-block; background: #A4D65E; color: #1F3A6A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0 16px; }
    .divider { height: 1px; background: #E2E8F0; margin: 24px 0; }
    .footer { background: #F8FAFC; padding: 24px 40px; text-align: center; color: #94A3B8; font-size: 12px; line-height: 1.6; }
    .footer a { color: #1F3A6A; text-decoration: none; }
    .social-link { display: inline-block; margin: 0 6px; color: #64748B; text-decoration: none; font-size: 13px; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, #1F3A6A, #A4D65E); }
  </style>
</head>
<body>
  <div class="container">
    <div class="accent-bar"></div>
    <div class="header">
      <img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/6890a03498323d7b7c29d34e_statdoc_logo.svg" alt="StatDoctor" style="height:40px;" />
    </div>
    <div class="body">
      ${processedBody.split("\n").map((line: string) => {
        if (line.trim() === "") return '<div style="height:12px;"></div>';
        if (line.trim().startsWith("•") || line.trim().match(/^\d+\./))
          return `<p style="margin:4px 0 4px 20px;">${line}</p>`;
        return `<p>${line}</p>`;
      }).join("\n")}
    </div>
    <div class="footer">
      <img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/68f895894dea0b8dd1abb404_statodoctor_logo_ico.svg" alt="StatDoctor" style="height:24px;margin-bottom:8px;" />
      <p style="margin:0 0 4px;">Connecting hospitals with locum doctors — directly.</p>
      <p style="margin:0;">
        <a href="https://statdoctor.app" class="social-link">statdoctor.app</a> ·
        <a href="https://linkedin.com/company/statdoctor" class="social-link">LinkedIn</a>
      </p>
      <div style="margin-top:12px;font-size:11px;color:#CBD5E1;">
        © ${new Date().getFullYear()} StatDoctor Pty Ltd · ABN 123 456 789
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Default Flows ──────────────────────────────────────────────────────

const DEFAULT_FLOWS: EmailFlow[] = [
  {
    id: "hospital-onboarding",
    name: "Hospital Onboarding",
    description: "Welcome sequence for new hospital sign-ups",
    audience: "hospitals",
    status: "draft",
    steps: [
      {
        id: "s1",
        type: "email",
        subject: "Welcome to StatDoctor – Let's get you set up",
        body: `Hi {{name}},

Welcome to StatDoctor! We're thrilled to have your hospital on board.

StatDoctor is the easiest way to fill locum shifts — no agencies, no middlemen. Here's what makes us different:

• Direct connection with verified doctors
• No placement fees or commissions
• Post shifts in under 60 seconds
• Real-time notifications when doctors apply

To get started, simply log into your dashboard and post your first shift. Our team is here to help every step of the way.

Best regards,
Anurag
Co-Founder, StatDoctor`,
      },
      { id: "s2", type: "delay", delayDays: 3 },
      {
        id: "s3",
        type: "email",
        subject: "Have you posted your first shift yet?",
        body: `Hi {{name}},

Just checking in — have you had a chance to post your first shift on StatDoctor?

If you need any help getting set up, I'm happy to jump on a quick 10-minute call to walk you through the process.

Here's what other hospitals love about the platform:

• Fill shifts 3x faster than traditional agencies
• Save up to 30% on locum costs
• Access a growing pool of 250+ verified doctors

Would any time this week work for a quick chat?

Best,
Anurag
Co-Founder, StatDoctor`,
      },
      { id: "s4", type: "delay", delayDays: 5 },
      {
        id: "s5",
        type: "email",
        subject: "Quick tips to get the most out of StatDoctor",
        body: `Hi {{name}},

I wanted to share a few tips that our most successful hospitals use:

1. Post shifts at least 2 weeks in advance — you'll get 3x more applications
2. Include shift details (department, requirements) — doctors apply faster to detailed posts
3. Set up recurring shifts — save time on repeat rosters
4. Respond to applications within 24 hours — top doctors get snapped up quickly

If you'd like a personalised demo or have any questions, just reply to this email.

We're building StatDoctor to make your life easier — your feedback matters!

Best,
Anurag
Co-Founder, StatDoctor`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cold-outreach-hospital",
    name: "Hospital Cold Outreach",
    description: "Cold outreach sequence for prospective hospitals",
    audience: "hospitals",
    status: "draft",
    steps: [
      {
        id: "c1",
        type: "email",
        subject: "Filling locum shifts without agency fees",
        body: `Hi {{name}},

I'm Anurag, co-founder of StatDoctor. We help hospitals fill locum shifts directly — without agency fees.

I noticed your hospital may be looking for a more efficient way to manage locum staffing. StatDoctor connects you directly with verified doctors, saving you time and money.

Here's what we offer:

• No placement fees or commissions
• 250+ verified doctors on the platform
• Post shifts and receive applications within hours
• Simple dashboard — post a shift in under 60 seconds

Would you be open to a quick 15-minute call to see if StatDoctor could help?

Best regards,
Anurag
Co-Founder, StatDoctor
anu@statdoctor.net`,
      },
      { id: "c2", type: "delay", delayDays: 4 },
      {
        id: "c3",
        type: "email",
        subject: "Re: Filling locum shifts without agency fees",
        body: `Hi {{name}},

Just wanted to follow up on my previous email about StatDoctor.

I understand you're busy — here's a 30-second summary:

StatDoctor = post a shift → doctors apply → you choose → done. No agencies.

Hospitals using StatDoctor are saving an average of 30% on locum costs. Happy to show you a quick demo if you're interested.

Best,
Anurag`,
      },
      { id: "c4", type: "delay", delayDays: 7 },
      {
        id: "c5",
        type: "email",
        subject: "Last follow up — StatDoctor for {{name}}",
        body: `Hi {{name}},

This is my final follow up — I don't want to spam your inbox!

If you're ever looking for an easier way to fill locum shifts without agency fees, StatDoctor is here. You can check us out at statdoctor.app.

No pressure at all — just wanted to make sure you knew the option exists.

Wishing you and your team all the best.

Cheers,
Anurag
Co-Founder, StatDoctor`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "doctor-engagement",
    name: "Doctor Re-engagement",
    description: "Re-engage inactive doctors who haven't applied to shifts",
    audience: "doctors",
    status: "draft",
    steps: [
      {
        id: "d1",
        type: "email",
        subject: "New locum shifts available near you",
        body: `Hi {{name}},

We've noticed you haven't checked StatDoctor in a while — and there are some great shifts waiting!

Hospitals are actively looking for doctors like you. Here's what's new:

• New shifts posted daily across Australia
• Flexible scheduling — pick the shifts that work for you
• Transparent pay rates — no agency cuts

Log back in and browse the latest shifts. Your next locum opportunity could be one tap away.

Best,
The StatDoctor Team`,
      },
      { id: "d2", type: "delay", delayDays: 5 },
      {
        id: "d3",
        type: "email",
        subject: "Doctors are earning more with StatDoctor",
        body: `Hi {{name}},

Quick update — doctors on StatDoctor are earning more because there are no agency fees eating into their pay.

Here's how it works:

1. Browse available shifts on the app
2. Apply to the ones you like
3. Work directly with the hospital — no middleman

It's that simple. And the best part? You keep more of what you earn.

See you on the platform!

Best,
The StatDoctor Team`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agency-poach-sequence",
    name: "Agency-Listed Hospital Outreach",
    description: "Target hospitals posting locum shifts through agencies — pitch StatDoctor as a cheaper direct alternative",
    audience: "hospitals",
    status: "draft",
    steps: [
      {
        id: "a1",
        type: "email",
        subject: "Noticed you're hiring locum doctors — there's a cheaper way",
        body: `Hi {{name}},

I'm Anurag from StatDoctor. I came across your hospital's locum listings and wanted to reach out.

We built StatDoctor specifically to help hospitals like yours fill locum shifts without the agency markup. Here's the difference:

Agency route: Post with an agency → pay 20-30% on top → limited visibility into who applies
StatDoctor: Post directly → verified doctors apply within hours → zero commission

We have 250+ verified doctors across Australia already on the platform. Hospitals that have switched are saving an average of 30% per locum placement.

Would you be open to a 10-minute call to see if it could work for your ED?

Best,
Anurag
Co-Founder, StatDoctor
anu@statdoctor.net`,
      },
      { id: "a2", type: "delay", delayDays: 3 },
      {
        id: "a3",
        type: "email",
        subject: "Re: Locum staffing without the agency fees",
        body: `Hi {{name}},

Quick follow up — I know how hectic running an ED can be, so I'll keep this brief.

StatDoctor is free for hospitals to use. You post a shift, doctors apply, you pick who you want. No contracts, no commissions, no lock-in.

Here's what takes 60 seconds on our platform:
1. Post your shift details (dates, rates, requirements)
2. Get notified as verified doctors apply
3. Confirm the doctor you want — done

We handle the verification so you don't have to chase documents. Every doctor on the platform has verified credentials, references, and AHPRA registration.

Happy to set up a quick demo if you'd like to see it in action.

Cheers,
Anurag`,
      },
      { id: "a4", type: "delay", delayDays: 5 },
      {
        id: "a5",
        type: "email",
        subject: "What {{name}} could save on locum costs",
        body: `Hi {{name}},

Last one from me — I promise!

I ran some quick numbers. If your ED fills even 2 locum shifts per month through agencies, you're likely paying $5,000–$15,000 in placement fees alone.

With StatDoctor, that cost drops to $0. Same quality doctors, same speed, zero commission.

If the timing isn't right now, no worries at all. But when you're ready to try a different approach to locum staffing, we're here: statdoctor.app

All the best to you and your team.

Cheers,
Anurag
Co-Founder, StatDoctor`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "acem-hospital-outreach",
    name: "ACEM Job Board Hospital Outreach",
    description: "Tailored sequence for hospitals found posting on the ACEM job board",
    audience: "hospitals",
    status: "draft",
    steps: [
      {
        id: "m1",
        type: "email",
        subject: "Saw your ACEM listing — a quicker way to fill ED shifts",
        body: `Hi {{name}},

I noticed your hospital has positions listed on the ACEM job board — so I know you're actively building your ED team.

While ACEM is great for training positions, if you also need to fill locum or short-term shifts, I wanted to introduce StatDoctor.

We're an Australian platform that connects hospitals directly with verified emergency doctors — no agencies, no placement fees. Hospitals post a shift and get applications within hours.

What makes us different:
• Every doctor is credential-verified (AHPRA, references, documents)
• Zero commission — hospitals and doctors connect directly
• Post a shift in under 60 seconds from your dashboard
• 250+ doctors across Australia already on the platform

Would a quick 15-minute call be useful to explore how StatDoctor could complement your existing recruitment?

Best regards,
Anurag
Co-Founder, StatDoctor
anu@statdoctor.net`,
      },
      { id: "m2", type: "delay", delayDays: 4 },
      {
        id: "m3",
        type: "email",
        subject: "Re: Quick way to fill ED locum shifts",
        body: `Hi {{name}},

Just circling back on my earlier email. I know recruiting for ED is always a juggle.

One thing I hear from ED directors is that agency locums are expensive and unpredictable. StatDoctor fixes both:

• You control the rates (post what you're willing to pay)
• You see who's applying and their full profile
• Doctors are verified before they even apply to your shifts

Several hospitals have told us they fill shifts 3x faster than going through an agency, and at a fraction of the cost.

Happy to send through a quick demo link or jump on a call — whatever works best.

Cheers,
Anurag`,
      },
      { id: "m4", type: "delay", delayDays: 6 },
      {
        id: "m5",
        type: "email",
        subject: "Final thought on locum staffing for your ED",
        body: `Hi {{name}},

This is my last follow up — I don't want to be that person!

If your hospital ever needs a fast, free way to find verified locum doctors for your ED, StatDoctor is here. No setup fees, no contracts, no commission.

You can check us out anytime at statdoctor.app or just reply to this email and I'll personally walk you through it.

Wishing your ED team all the best — it's tough work and you're doing an incredible job.

Cheers,
Anurag
Co-Founder, StatDoctor`,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ── Helpers ────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const AUDIENCE_CONFIG = {
  hospitals: { icon: Building2, label: "Hospitals", color: "bg-purple-100 text-purple-800" },
  doctors: { icon: Stethoscope, label: "Doctors", color: "bg-blue-100 text-blue-800" },
  investors: { icon: Users, label: "Investors", color: "bg-green-100 text-green-800" },
};

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-800" },
};

// ── Component ──────────────────────────────────────────────────────────

export default function EmailFlowsPage() {
  const queryClient = useQueryClient();

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["email-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_flows")
        .select("*")
        .order("created_at", { ascending: false });
      // Fall back to defaults if table doesn't exist yet (migration not run)
      if (error) return DEFAULT_FLOWS;
      return (data || []).length > 0 ? data.map(dbToFlow) : DEFAULT_FLOWS;
    },
  });

  const [editingFlow, setEditingFlow] = useState<EmailFlow | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState<FlowStep | null>(null);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["email-flows"] });

  // ── New flow ──

  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDesc, setNewFlowDesc] = useState("");
  const [newFlowAudience, setNewFlowAudience] = useState<EmailFlow["audience"]>("hospitals");

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      toast.error("Flow name is required");
      return;
    }
    const steps: FlowStep[] = [
      {
        id: genId(),
        type: "email",
        subject: "",
        body: `Hi {{name}},\n\n\n\nBest regards,\nThe StatDoctor Team`,
      },
    ];
    const { data, error } = await supabase
      .from("email_flows")
      .insert({
        name: newFlowName.trim(),
        description: newFlowDesc.trim(),
        audience: newFlowAudience,
        status: "draft",
        steps,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    invalidate();
    setEditingFlow(dbToFlow(data));
    setShowNewFlow(false);
    setNewFlowName("");
    setNewFlowDesc("");
    toast.success("Flow created");
  };

  // ── Edit flow ──

  const updateEditingFlow = (patch: Partial<EmailFlow>) => {
    if (!editingFlow) return;
    setEditingFlow({ ...editingFlow, ...patch, updatedAt: new Date().toISOString() });
  };

  const saveEditingFlow = async () => {
    if (!editingFlow) return;
    const { error } = await supabase
      .from("email_flows")
      .update({
        name: editingFlow.name,
        description: editingFlow.description,
        audience: editingFlow.audience,
        status: editingFlow.status,
        steps: editingFlow.steps,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingFlow.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
    toast.success("Flow saved");
  };

  const deleteFlow = async (id: string) => {
    const { error } = await supabase.from("email_flows").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidate();
    if (editingFlow?.id === id) setEditingFlow(null);
    toast.success("Flow deleted");
  };

  const duplicateFlow = async (flow: EmailFlow) => {
    const { error } = await supabase
      .from("email_flows")
      .insert({
        name: `${flow.name} (copy)`,
        description: flow.description,
        audience: flow.audience,
        status: "draft",
        steps: flow.steps.map((s) => ({ ...s, id: genId() })),
      });
    if (error) { toast.error(error.message); return; }
    invalidate();
    toast.success("Flow duplicated");
  };

  const toggleFlowStatus = async (flow: EmailFlow) => {
    const newStatus = flow.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("email_flows")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", flow.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
    if (editingFlow?.id === flow.id) {
      setEditingFlow({ ...editingFlow, status: newStatus as EmailFlow["status"] });
    }
    toast.success(`Flow ${newStatus === "active" ? "activated" : "paused"}`);
  };

  // ── Step management ──

  const addStep = (type: "email" | "delay") => {
    if (!editingFlow) return;
    const newStep: FlowStep =
      type === "email"
        ? { id: genId(), type: "email", subject: "", body: `Hi {{name}},\n\n\n\nBest regards,\nThe StatDoctor Team` }
        : { id: genId(), type: "delay", delayDays: 3 };
    updateEditingFlow({ steps: [...editingFlow.steps, newStep] });
    setExpandedStep(newStep.id);
  };

  const updateStep = (stepId: string, patch: Partial<FlowStep>) => {
    if (!editingFlow) return;
    updateEditingFlow({
      steps: editingFlow.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    });
  };

  const removeStep = (stepId: string) => {
    if (!editingFlow) return;
    updateEditingFlow({ steps: editingFlow.steps.filter((s) => s.id !== stepId) });
  };

  const moveStep = (stepId: string, dir: "up" | "down") => {
    if (!editingFlow) return;
    const idx = editingFlow.steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= editingFlow.steps.length) return;
    const steps = [...editingFlow.steps];
    [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
    updateEditingFlow({ steps });
  };

  // ── Preview ──

  const openPreview = (step: FlowStep) => {
    setPreviewStep(step);
    setShowPreview(true);
  };

  // ── Flow list view ──

  if (!editingFlow) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1F3A6A]">Email Flows</h2>
            <p className="text-sm text-muted-foreground">
              Automated email sequences with StatDoctor branding
            </p>
          </div>
          <Button onClick={() => setShowNewFlow(true)} className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90">
            <Plus className="mr-1.5 h-4 w-4" />
            New Flow
          </Button>
        </div>

        {flows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="text-lg font-medium mb-1">No email flows yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create automated email sequences to engage hospitals and doctors
              </p>
              <Button onClick={() => setShowNewFlow(true)} className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90">
                <Plus className="mr-1.5 h-4 w-4" />
                Create your first flow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {flows.map((flow) => {
              const emailSteps = flow.steps.filter((s) => s.type === "email").length;
              const totalDays = flow.steps.reduce((acc, s) => acc + (s.delayDays || 0), 0);
              const AudienceIcon = AUDIENCE_CONFIG[flow.audience].icon;
              const statusCfg = STATUS_CONFIG[flow.status];

              return (
                <Card
                  key={flow.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: flow.status === "active" ? "#A4D65E" : flow.status === "paused" ? "#F59E0B" : "#CBD5E1" }}
                  onClick={() => setEditingFlow(flow)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#1F3A6A] truncate">{flow.name}</h3>
                          <Badge variant="secondary" className={statusCfg.color}>
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="secondary" className={AUDIENCE_CONFIG[flow.audience].color}>
                            <AudienceIcon className="h-3 w-3 mr-1" />
                            {AUDIENCE_CONFIG[flow.audience].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{flow.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {emailSteps} email{emailSteps !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {totalDays} day{totalDays !== 1 ? "s" : ""} total
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFlowStatus(flow)}
                          title={flow.status === "active" ? "Pause flow" : "Activate flow"}
                        >
                          {flow.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateFlow(flow)}
                          title="Duplicate flow"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => deleteFlow(flow.id)}
                          title="Delete flow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* New Flow Dialog */}
        <Dialog open={showNewFlow} onOpenChange={setShowNewFlow}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Email Flow</DialogTitle>
              <DialogDescription>
                Set up an automated email sequence with StatDoctor branding
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Flow Name *</Label>
                <Input
                  placeholder="e.g. Hospital Onboarding"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of this flow"
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={newFlowAudience} onValueChange={(v) => setNewFlowAudience(v as EmailFlow["audience"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospitals">
                      <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Hospitals</span>
                    </SelectItem>
                    <SelectItem value="doctors">
                      <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Doctors</span>
                    </SelectItem>
                    <SelectItem value="investors">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Investors</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewFlow(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFlow} className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90">
                Create Flow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Flow editor view ──

  const emailStepCount = editingFlow.steps.filter((s) => s.type === "email").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { saveEditingFlow(); setEditingFlow(null); }}>
            ← Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#1F3A6A]">{editingFlow.name}</h2>
              <Badge variant="secondary" className={STATUS_CONFIG[editingFlow.status].color}>
                {STATUS_CONFIG[editingFlow.status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{editingFlow.description || "No description"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleFlowStatus(editingFlow)}
          >
            {editingFlow.status === "active" ? (
              <><Pause className="mr-1.5 h-4 w-4" /> Pause</>
            ) : (
              <><Play className="mr-1.5 h-4 w-4" /> Activate</>
            )}
          </Button>
          <Button size="sm" onClick={saveEditingFlow} className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90">
            Save Flow
          </Button>
        </div>
      </div>

      {/* Flow name/desc edit */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Flow Name</Label>
              <Input
                value={editingFlow.name}
                onChange={(e) => updateEditingFlow({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={editingFlow.description}
                onChange={(e) => updateEditingFlow({ description: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-0">
        {editingFlow.steps.map((step, idx) => {
          const isExpanded = expandedStep === step.id;
          let emailNum = 0;
          if (step.type === "email") {
            emailNum = editingFlow.steps.slice(0, idx + 1).filter((s) => s.type === "email").length;
          }

          return (
            <div key={step.id}>
              {/* Connector line */}
              {idx > 0 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-6 bg-slate-300" />
                </div>
              )}

              <Card className={`border-l-4 ${step.type === "email" ? "border-l-[#1F3A6A]" : "border-l-amber-400"}`}>
                <CardContent className="p-0">
                  {/* Step header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <div className={`rounded-full p-1.5 ${step.type === "email" ? "bg-[#1F3A6A]/10 text-[#1F3A6A]" : "bg-amber-100 text-amber-700"}`}>
                      {step.type === "email" ? <Mail className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {step.type === "email" ? (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Email {emailNum}</span>
                          <p className="text-sm font-medium truncate">
                            {step.subject || <span className="text-muted-foreground italic">No subject</span>}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Wait</span>
                          <p className="text-sm font-medium">
                            {step.delayDays} day{step.delayDays !== 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {step.type === "email" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPreview(step)} title="Preview branded email">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(step.id, "up")} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(step.id, "down")} disabled={idx === editingFlow.steps.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => removeStep(step.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-slate-50/30">
                      {step.type === "email" ? (
                        <div className="space-y-3 pt-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Subject Line</Label>
                            <Input
                              value={step.subject || ""}
                              onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                              placeholder="Email subject..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Email Body</Label>
                              <span className="text-[10px] text-muted-foreground">
                                Use {"{{name}}"} for personalization
                              </span>
                            </div>
                            <Textarea
                              value={step.body || ""}
                              onChange={(e) => updateStep(step.id, { body: e.target.value })}
                              rows={10}
                              placeholder="Write your email..."
                              className="font-mono text-sm"
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openPreview(step)}>
                            <Eye className="mr-1.5 h-4 w-4" />
                            Preview with StatDoctor branding
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-3">
                          <Label className="text-xs">Wait (days)</Label>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Input
                              type="number"
                              min={1}
                              max={90}
                              value={step.delayDays || 3}
                              onChange={(e) => updateStep(step.id, { delayDays: parseInt(e.target.value) || 1 })}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">days before next step</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}

        {/* Add step buttons */}
        <div className="flex justify-center py-1">
          <div className="w-px h-4 bg-slate-300" />
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => addStep("email")} className="text-[#1F3A6A]">
            <Mail className="mr-1.5 h-4 w-4" />
            Add Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => addStep("delay")} className="text-amber-700">
            <Clock className="mr-1.5 h-4 w-4" />
            Add Delay
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <Card className="mt-6 bg-[#1F3A6A]/5 border-[#1F3A6A]/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-[#1F3A6A]" />
                <strong>{emailStepCount}</strong> email{emailStepCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <strong>{editingFlow.steps.reduce((a, s) => a + (s.delayDays || 0), 0)}</strong> days total
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Emails will be sent via Gmail with StatDoctor branding
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview — StatDoctor Branded
            </DialogTitle>
          </DialogHeader>
          {previewStep && (
            <div>
              <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex gap-2">
                  <span className="font-medium text-muted-foreground">Subject:</span>
                  <span>{previewStep.subject}</span>
                </div>
              </div>
              <ScrollArea className="h-[500px] border rounded-lg">
                <iframe
                  srcDoc={brandedEmailPreview(previewStep.subject || "", previewStep.body || "", "Dr. Sarah Jones")}
                  className="w-full h-[800px] border-0"
                  title="Email preview"
                />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
