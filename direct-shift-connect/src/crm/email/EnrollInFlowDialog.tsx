import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import type { EmailFlow, FlowStep } from "../shared/types";

interface Recipient {
  entityType: "hospital" | "doctor" | "investor";
  entityId: string;
  name: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
}

function computeNextSendAt(steps: FlowStep[], startIndex: number): string | null {
  // If the step at startIndex is an email, send now
  // If it's a delay, skip forward
  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i];
    if (step.type === "email") {
      if (i === startIndex) return new Date().toISOString();
      // Sum delay days before this email
      let days = 0;
      for (let j = startIndex; j < i; j++) {
        if (steps[j].type === "delay" && steps[j].delayDays) {
          days += steps[j].delayDays!;
        }
      }
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }
  }
  return null;
}

export default function EnrollInFlowDialog({ open, onOpenChange, recipients }: Props) {
  const queryClient = useQueryClient();
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);

  const { data: flows = [] } = useQuery({
    queryKey: ["email-flows-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_flows")
        .select("*")
        .in("status", ["active", "draft"])
        .order("name");
      if (error) throw error;
      return data as (EmailFlow & { created_at: string; updated_at: string })[];
    },
    enabled: open,
  });

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);

  const handleEnroll = async () => {
    if (!selectedFlow) {
      toast.error("Select a flow first");
      return;
    }

    const steps = selectedFlow.steps as FlowStep[];
    if (steps.length === 0) {
      toast.error("Selected flow has no steps");
      return;
    }

    setEnrolling(true);
    let successCount = 0;
    let skipCount = 0;

    // Check existing enrollments to avoid duplicates
    const { data: existing } = await supabase
      .from("email_enrollments")
      .select("entity_id")
      .eq("flow_id", selectedFlowId)
      .in("status", ["active", "paused"]);

    const enrolledIds = new Set((existing || []).map((e: { entity_id: string }) => e.entity_id));

    for (const r of recipients) {
      if (enrolledIds.has(r.entityId)) {
        skipCount++;
        continue;
      }
      if (!r.email) {
        skipCount++;
        continue;
      }

      const nextSendAt = computeNextSendAt(steps, 0);

      const { error } = await supabase.from("email_enrollments").insert({
        flow_id: selectedFlowId,
        entity_type: r.entityType,
        entity_id: r.entityId,
        entity_name: r.name,
        entity_email: r.email,
        current_step_index: 0,
        status: "active",
        next_send_at: nextSendAt,
      });

      if (error) {
        console.error("Enrollment error:", r.name, error.message);
      } else {
        successCount++;
      }
    }

    setEnrolling(false);
    queryClient.invalidateQueries({ queryKey: ["email-enrollments"] });

    if (successCount > 0) {
      toast.success(`Enrolled ${successCount} ${successCount === 1 ? "recipient" : "recipients"} in "${selectedFlow.name}"`);
    }
    if (skipCount > 0) {
      toast.info(`${skipCount} skipped (already enrolled or no email)`);
    }

    onOpenChange(false);
    setSelectedFlowId("");
  };

  const emailStepCount = selectedFlow
    ? (selectedFlow.steps as FlowStep[]).filter((s) => s.type === "email").length
    : 0;
  const totalDays = selectedFlow
    ? (selectedFlow.steps as FlowStep[]).reduce((sum, s) => sum + (s.type === "delay" ? (s.delayDays || 0) : 0), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Enroll in Email Flow
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"} selected
            </p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {recipients.slice(0, 10).map((r) => (
                <Badge key={r.entityId} variant="secondary" className="text-xs">
                  {r.name}
                </Badge>
              ))}
              {recipients.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{recipients.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Select Flow</label>
            <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an email flow..." />
              </SelectTrigger>
              <SelectContent>
                {flows.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      {f.name}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        f.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {f.status}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFlow && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{selectedFlow.name}</p>
              {selectedFlow.description && (
                <p className="text-xs text-muted-foreground">{selectedFlow.description}</p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {emailStepCount} emails
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {totalDays} days
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {(selectedFlow.steps as FlowStep[]).map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-medium">
                      {i + 1}
                    </span>
                    {step.type === "email" ? (
                      <span className="text-muted-foreground truncate">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {step.subject || "(no subject)"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Wait {step.delayDays} days
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={!selectedFlowId || enrolling || recipients.length === 0}
          >
            {enrolling ? "Enrolling..." : `Enroll ${recipients.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
