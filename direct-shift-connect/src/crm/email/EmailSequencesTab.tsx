import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Pause, Play, X, ChevronDown, ChevronRight, Mail, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { EmailEnrollment, EmailSendLog } from "../shared/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const LOG_STATUS_COLORS: Record<string, string> = {
  draft_created: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-600",
};

export default function EmailSequencesTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["email-enrollments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_enrollments")
        .select("*, flow:email_flows(*)")
        .order("enrolled_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (EmailEnrollment & { flow: { name: string; steps: unknown[] } })[];
    },
  });

  const { data: sendLogs = [] } = useQuery({
    queryKey: ["email-send-logs", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .eq("enrollment_id", expandedId)
        .order("step_index");
      if (error) throw error;
      return data as EmailSendLog[];
    },
    enabled: !!expandedId,
  });

  const handlePauseResume = async (enrollment: EmailEnrollment) => {
    const newStatus = enrollment.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("email_enrollments")
      .update({ status: newStatus })
      .eq("id", enrollment.id);
    if (error) {
      toast.error("Failed to update enrollment");
      return;
    }
    toast.success(`Enrollment ${newStatus === "active" ? "resumed" : "paused"}`);
    queryClient.invalidateQueries({ queryKey: ["email-enrollments"] });
  };

  const handleCancel = async (enrollmentId: string) => {
    const { error } = await supabase
      .from("email_enrollments")
      .update({ status: "cancelled" })
      .eq("id", enrollmentId);
    if (error) {
      toast.error("Failed to cancel enrollment");
      return;
    }
    toast.success("Enrollment cancelled");
    queryClient.invalidateQueries({ queryKey: ["email-enrollments"] });
  };

  const activeCount = enrollments.filter((e) => e.status === "active").length;
  const pausedCount = enrollments.filter((e) => e.status === "paused").length;
  const completedCount = enrollments.filter((e) => e.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-50 p-2">
              <Play className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-yellow-50 p-2">
              <Pause className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pausedCount}</div>
              <p className="text-xs text-muted-foreground">Paused</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {enrollments.length} enrollment{enrollments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading enrollments...</p>
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No enrollments yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Enroll hospitals or doctors into an email flow from their detail page or prospects list
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 bg-slate-50 border-b px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="w-6" />
            <div className="flex-1">Recipient</div>
            <div className="w-40">Flow</div>
            <div className="w-24 text-center">Step</div>
            <div className="w-24 text-center">Status</div>
            <div className="w-36">Next Send</div>
            <div className="w-28" />
          </div>

          {/* Rows */}
          <div className="max-h-[calc(100vh-480px)] overflow-auto">
            {enrollments.map((enrollment) => {
              const isExpanded = expandedId === enrollment.id;
              const flowSteps = (enrollment.flow?.steps as unknown[]) || [];
              return (
                <div key={enrollment.id}>
                  <div
                    className="flex items-center gap-2 px-4 py-3 border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : enrollment.id)}
                  >
                    <div className="w-6">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{enrollment.entity_name || enrollment.entity_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{enrollment.entity_email}</p>
                    </div>
                    <div className="w-40 truncate text-sm text-muted-foreground">
                      {enrollment.flow?.name || "—"}
                    </div>
                    <div className="w-24 text-center text-sm">
                      {enrollment.current_step_index + 1} / {flowSteps.length}
                    </div>
                    <div className="w-24 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[enrollment.status] || ""}`}>
                        {enrollment.status}
                      </span>
                    </div>
                    <div className="w-36 text-xs text-muted-foreground">
                      {enrollment.next_send_at
                        ? new Date(enrollment.next_send_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </div>
                    <div className="w-28 flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      {(enrollment.status === "active" || enrollment.status === "paused") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handlePauseResume(enrollment)}
                            title={enrollment.status === "active" ? "Pause" : "Resume"}
                          >
                            {enrollment.status === "active" ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => handleCancel(enrollment.id)}
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded send log */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-b px-10 py-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Send Log</p>
                      {sendLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No emails sent yet</p>
                      ) : (
                        sendLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-3 text-xs">
                            <span className="w-16 text-muted-foreground">Step {log.step_index + 1}</span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${LOG_STATUS_COLORS[log.status] || ""}`}>
                              {log.status.replace("_", " ")}
                            </span>
                            <span className="flex-1 truncate text-muted-foreground">{log.subject || "(no subject)"}</span>
                            <span className="text-muted-foreground">
                              {log.sent_at
                                ? new Date(log.sent_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })
                                : log.created_at
                                ? new Date(log.created_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })
                                : "—"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
