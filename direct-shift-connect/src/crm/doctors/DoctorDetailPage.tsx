import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "../shared/components/StatusBadge";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { Doctor, DoctorActivity, DoctorStatus } from "../shared/types";

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Doctor;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["doctor-activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("doctor_activities")
        .select("*")
        .eq("doctor_id", id!)
        .order("created_at", { ascending: false });
      return (data || []) as DoctorActivity[];
    },
    enabled: !!id,
  });

  const [form, setForm] = useState<Partial<Doctor>>({});

  useEffect(() => {
    if (doctor) setForm(doctor);
  }, [doctor]);

  const updateDoctor = useMutation({
    mutationFn: async (updates: Partial<Doctor>) => {
      const { error } = await supabase.from("doctors").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", id] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Doctor updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteDoctor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("doctors").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      navigate("/crm/doctors");
      toast.success("Doctor deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    const { id: _id, created_at: _ca, updated_at: _ua, ...updates } = form;
    updateDoctor.mutate(updates);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!doctor) {
    return <div className="py-20 text-center text-muted-foreground">Doctor not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/doctors")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1F3A6A]">{doctor.full_name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={doctor.status} />
            {doctor.specialty && <span className="text-sm text-muted-foreground">{doctor.specialty}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={updateDoctor.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => {
            if (confirm("Delete this doctor?")) deleteDoctor.mutate();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={form.full_name || ""}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status || "pipeline"}
                    onValueChange={(val) => setForm({ ...form, status: val as DoctorStatus })}
                  >
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
                  <Label>Specialty</Label>
                  <Input
                    value={form.specialty || ""}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={form.location || ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    value={form.source || ""}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={form.app_downloaded || false}
                    onChange={(e) => setForm({ ...form, app_downloaded: e.target.checked })}
                    className="rounded"
                  />
                  <Label>App Downloaded</Label>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* UTM Tracking */}
          {(doctor.utm_source || doctor.utm_medium || doctor.utm_campaign) && (
            <Card>
              <CardHeader>
                <CardTitle>Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="font-medium">{doctor.utm_source || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Medium</p>
                    <p className="font-medium">{doctor.utm_medium || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Campaign</p>
                    <p className="font-medium">{doctor.utm_campaign || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            ) : (
              <div className="space-y-4">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#A4D65E]" />
                    <div>
                      <p className="font-medium">{a.action}</p>
                      {a.summary && <p className="text-muted-foreground">{a.summary}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
