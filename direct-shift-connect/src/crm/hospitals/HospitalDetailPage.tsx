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
import { ArrowLeft, Save, Trash2, DollarSign, CheckCircle2, TrendingUp, Pencil, Check, X, Mail, ExternalLink, Send } from "lucide-react";
import { ComposeEmailDialog } from "../shared/components/ComposeEmailDialog";
import { toast } from "sonner";
import { logActivity } from "../shared/logActivity";
import { useState, useEffect, useRef } from "react";
import type { Hospital, HospitalActivity, HospitalStatus } from "../shared/types";


export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: hospital, isLoading } = useQuery({
    queryKey: ["hospital", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospitals").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Hospital;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["hospital-activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_activities")
        .select("*")
        .eq("hospital_id", id!)
        .order("created_at", { ascending: false });
      return (data || []) as HospitalActivity[];
    },
    enabled: !!id,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["hospital-deals", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_deals")
        .select("*, stage:hospital_pipeline_stages(name, color)")
        .eq("hospital_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch emails related to this hospital (by contact email or hospital name)
  const contactEmail = hospital?.contact_email;
  const hospitalName = hospital?.name;
  const { data: relatedEmails = [] } = useQuery({
    queryKey: ["hospital-emails", id, contactEmail, hospitalName],
    queryFn: async () => {
      if (!contactEmail && !hospitalName) return [];
      // Search by contact email in from/to fields, or hospital name in subject
      const conditions: string[] = [];
      if (contactEmail) {
        conditions.push(`from_address.ilike.%${contactEmail}%`);
        conditions.push(`to_addresses.ilike.%${contactEmail}%`);
      }
      if (hospitalName) {
        conditions.push(`subject.ilike.%${hospitalName}%`);
      }
      const { data } = await supabase
        .from("emails")
        .select("id, subject, from_name, from_address, date, snippet, is_read")
        .or(conditions.join(","))
        .order("date", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!id && !!(contactEmail || hospitalName),
  });

  const [editingDealId, setEditingDealId] = useState<string | false>(false);
  const [dealInput, setDealInput] = useState("");
  const dealInputRef = useRef<HTMLInputElement>(null);
  const [editingShifts, setEditingShifts] = useState(false);
  const [shiftCountInput, setShiftCountInput] = useState("");
  const [shiftRateInput, setShiftRateInput] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const [form, setForm] = useState<Partial<Hospital>>({});

  useEffect(() => {
    if (hospital) setForm(hospital);
  }, [hospital]);

  const updateHospital = useMutation({
    mutationFn: async (updates: Partial<Hospital>) => {
      const { error } = await supabase.from("hospitals").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital", id] });
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["hospital-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast.success("Hospital updated");
      logActivity({
        module: "hospitals",
        entityId: id!,
        action: "hospital_updated",
        summary: `Updated ${form.name || "hospital"} details`,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteHospital = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hospitals").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      navigate("/crm/hospitals");
      toast.success("Hospital deleted");
      logActivity({
        module: "hospitals",
        action: "hospital_deleted",
        summary: `Deleted ${form.name || "hospital"}`,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    const { id: _id, created_at: _ca, updated_at: _ua, ...updates } = form;
    updateHospital.mutate(updates);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!hospital) {
    return <div className="py-20 text-center text-muted-foreground">Hospital not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/hospitals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1F3A6A]">{hospital.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={hospital.status} />
            {hospital.location && <span className="text-sm text-muted-foreground">{hospital.location}</span>}
          </div>
        </div>
        {hospital.contact_email && (
          <Button variant="outline" size="sm" onClick={() => setShowCompose(true)}>
            <Send className="mr-2 h-4 w-4" />
            Email
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleSave} disabled={updateHospital.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => {
            if (confirm("Delete this hospital?")) deleteHospital.mutate();
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
                  <Label>Hospital Name</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status || "pipeline"} onValueChange={(val) => setForm({ ...form, status: val as HospitalStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pipeline">Pipeline</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="churned">Churned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Subscription Tier</Label>
                  <Input value={form.subscription_tier || ""} onChange={(e) => setForm({ ...form, subscription_tier: e.target.value })} />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#1F3A6A]" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const SHIFT_DEAL_PREFIX = "Shift Revenue";

                // Parse shift revenue from "Shift Revenue" deals
                const shiftDeal = deals.find((d: any) => d.name?.startsWith(SHIFT_DEAL_PREFIX));
                let shiftCount = 0;
                let shiftRate = 99;
                if (shiftDeal) {
                  const notes = shiftDeal.notes || "";
                  const sm = notes.match(/shifts:(\d+)/);
                  const rm = notes.match(/rate:(\d+)/);
                  shiftCount = sm ? parseInt(sm[1]) : 0;
                  shiftRate = rm ? parseInt(rm[1]) : 99;
                }
                const shiftRevenue = shiftCount * shiftRate;

                const shiftDealIds = new Set(deals.filter((d: any) => d.name?.startsWith(SHIFT_DEAL_PREFIX)).map((d: any) => d.id));

                // Closed deals (excluding shift deals)
                const closedDeals = deals.filter((d: any) => {
                  if (shiftDealIds.has(d.id)) return false;
                  const stageName = d.stage?.name?.toLowerCase() || "";
                  return (stageName.includes("closed") && !stageName.includes("lost")) || stageName.includes("won") || stageName.includes("subscription") || stageName.includes("pay per shift");
                });
                const closedRevenue = closedDeals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);

                // Pipeline (open) deals
                const openDeals = deals.filter((d: any) => {
                  if (shiftDealIds.has(d.id)) return false;
                  const stageName = d.stage?.name?.toLowerCase() || "";
                  return !stageName.includes("closed") && !stageName.includes("lost") && !stageName.includes("won") && !stageName.includes("pay per shift");
                });
                const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);

                const totalRevenue = closedRevenue + shiftRevenue;

                const saveDealValue = (dealId: string) => {
                  const newVal = parseFloat(dealInput) || 0;
                  supabase
                    .from("hospital_deals")
                    .update({ value: newVal })
                    .eq("id", dealId)
                    .then(({ error }) => {
                      if (error) { toast.error(error.message); return; }
                      queryClient.invalidateQueries({ queryKey: ["hospital-deals", id] });
                      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
                      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
                      setEditingDealId(false);
                      toast.success("Value updated");
                      logActivity({
                        module: "hospitals",
                        entityId: id!,
                        action: "deal_value_updated",
                        summary: `Updated deal value to $${newVal.toLocaleString()}`,
                      });
                    });
                };

                const saveShifts = () => {
                  const newShifts = parseInt(shiftCountInput) || 0;
                  const newRate = parseInt(shiftRateInput) || 99;
                  const notes = `shifts:${newShifts}|rate:${newRate}`;
                  const value = newShifts * newRate;

                  if (shiftDeal) {
                    supabase
                      .from("hospital_deals")
                      .update({ value, notes, updated_at: new Date().toISOString() })
                      .eq("id", shiftDeal.id)
                      .then(({ error }) => {
                        if (error) { toast.error(error.message); return; }
                        queryClient.invalidateQueries({ queryKey: ["hospital-deals", id] });
                        queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
                        setEditingShifts(false);
                        toast.success("Shift revenue updated");
                      });
                  } else {
                    // Create new shift deal
                    supabase
                      .from("hospital_pipeline_stages")
                      .select("id, name")
                      .order("position")
                      .then(({ data: stages }) => {
                        const closedStage = (stages || []).find((s: any) => {
                          const n = s.name.toLowerCase();
                          return n.includes("pay per shift") || (n.includes("closed") && !n.includes("lost"));
                        });
                        if (!closedStage) { toast.error("No closed stage found"); return; }
                        supabase
                          .from("hospital_deals")
                          .insert({
                            name: `${SHIFT_DEAL_PREFIX} — ${form.name || "Hospital"}`,
                            hospital_id: id!,
                            stage_id: closedStage.id,
                            value,
                            notes,
                            position: 999,
                          })
                          .then(({ error }) => {
                            if (error) { toast.error(error.message); return; }
                            queryClient.invalidateQueries({ queryKey: ["hospital-deals", id] });
                            queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
                            setEditingShifts(false);
                            toast.success("Shift revenue added");
                          });
                      });
                  }
                };

                // Display deal name: strip "Initial Deal" patterns, just show stage
                const dealDisplayName = (deal: any) => {
                  const name = deal.name || "";
                  // If the deal name matches the hospital name or contains "Initial Deal", just show the stage
                  const hospitalName = form.name || "";
                  const cleaned = name
                    .replace(/\s*[-–—]\s*Initial Deal/i, "")
                    .replace(/Initial Deal\s*[-–—]?\s*/i, "")
                    .trim();
                  if (!cleaned || cleaned.toLowerCase() === hospitalName.toLowerCase()) {
                    return deal.stage?.name || "Deal";
                  }
                  return cleaned;
                };

                return (
                  <div className="space-y-4">
                    {/* Subscription / Closed Revenue */}
                    <div className="rounded-lg border bg-green-50/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <p className="text-sm font-medium text-green-800">Subscription Revenue</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          ${closedRevenue.toLocaleString()}
                        </p>
                      </div>
                      {closedDeals.length > 0 ? (
                        <div className="space-y-1.5">
                          {closedDeals.map((deal: any) => (
                            <div key={deal.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-green-50 group text-sm">
                              <div className="min-w-0 flex-1">
                                <span className="truncate text-gray-700">{dealDisplayName(deal)}</span>
                                <span className="ml-2 text-[10px] text-muted-foreground">{deal.stage?.name}</span>
                              </div>
                              {editingDealId === deal.id ? (
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="text-sm font-bold text-green-600">$</span>
                                  <Input
                                    ref={dealInputRef}
                                    type="number"
                                    step="0.01"
                                    value={dealInput}
                                    onChange={(e) => setDealInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveDealValue(deal.id);
                                      else if (e.key === "Escape") setEditingDealId(false);
                                    }}
                                    className="h-7 w-28 text-sm font-bold"
                                  />
                                  <button className="p-0.5 rounded hover:bg-green-100 text-green-600" onClick={() => saveDealValue(deal.id)}>
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400" onClick={() => setEditingDealId(false)}>
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <span className="font-semibold text-green-600">${Number(deal.value || 0).toLocaleString()}</span>
                                  <button
                                    className="p-0.5 rounded hover:bg-green-100 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setEditingDealId(deal.id);
                                      setDealInput(String(Number(deal.value || 0)));
                                      setTimeout(() => dealInputRef.current?.focus(), 50);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No closed deals yet</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Pipeline Value — editable per deal */}
                      <div className="rounded-lg border bg-blue-50/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Pipeline Value</p>
                        <p className="text-lg font-bold text-blue-600 mb-1">
                          ${pipelineValue.toLocaleString()}
                        </p>
                        {openDeals.length > 0 ? (
                          <div className="space-y-1">
                            {openDeals.map((deal: any) => (
                              <div key={deal.id} className="flex items-center justify-between text-xs group hover:bg-blue-50 rounded px-1 py-0.5">
                                <span className="truncate text-gray-600 flex-1 min-w-0">
                                  {dealDisplayName(deal)}
                                </span>
                                {editingDealId === deal.id ? (
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    <span className="text-xs font-bold text-blue-600">$</span>
                                    <Input
                                      ref={dealInputRef}
                                      type="number"
                                      value={dealInput}
                                      onChange={(e) => setDealInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveDealValue(deal.id);
                                        else if (e.key === "Escape") setEditingDealId(false);
                                      }}
                                      className="h-6 w-20 text-xs font-bold"
                                    />
                                    <button className="p-0.5 rounded hover:bg-blue-100 text-blue-600" onClick={() => saveDealValue(deal.id)}>
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400" onClick={() => setEditingDealId(false)}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    <span className="font-medium text-blue-600">${Number(deal.value || 0).toLocaleString()}</span>
                                    <button
                                      className="p-0.5 rounded hover:bg-blue-100 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        setEditingDealId(deal.id);
                                        setDealInput(String(Number(deal.value || 0)));
                                        setTimeout(() => dealInputRef.current?.focus(), 50);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No open deals</p>
                        )}
                      </div>

                      {/* Shift Revenue — editable */}
                      <div className="rounded-lg border bg-purple-50/50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                            <p className="text-xs text-muted-foreground">Shift Revenue</p>
                          </div>
                          {!editingShifts && (
                            <button
                              className="p-0.5 rounded hover:bg-purple-100 text-purple-600 opacity-70 hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingShifts(true);
                                setShiftCountInput(String(shiftCount));
                                setShiftRateInput(String(shiftRate));
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {editingShifts ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] text-muted-foreground">Shifts</label>
                                <Input
                                  type="number"
                                  value={shiftCountInput}
                                  onChange={(e) => setShiftCountInput(e.target.value)}
                                  className="h-7 text-sm"
                                  min={0}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] text-muted-foreground">Rate ($)</label>
                                <Input
                                  type="number"
                                  value={shiftRateInput}
                                  onChange={(e) => setShiftRateInput(e.target.value)}
                                  className="h-7 text-sm"
                                  min={0}
                                />
                              </div>
                            </div>
                            <p className="text-xs font-medium text-purple-600">
                              = ${((parseInt(shiftCountInput) || 0) * (parseInt(shiftRateInput) || 0)).toLocaleString()}
                            </p>
                            <div className="flex gap-1">
                              <button className="flex-1 h-7 rounded bg-purple-600 text-white text-xs font-medium hover:bg-purple-700" onClick={saveShifts}>
                                Save
                              </button>
                              <button className="h-7 px-2 rounded border text-xs text-muted-foreground hover:bg-gray-50" onClick={() => setEditingShifts(false)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-purple-600">
                              ${shiftRevenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {shiftCount > 0 ? `${shiftCount} × $${shiftRate}/shift` : "Click edit to add shifts"}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Total */}
                      <div className="col-span-2 rounded-lg border bg-[#1F3A6A]/5 p-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-[#1F3A6A]" />
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                        <p className="text-lg font-bold text-[#1F3A6A]">
                          ${totalRevenue.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Subscriptions + Shifts</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Deals — hide shift revenue deals */}
          {(() => {
            const visibleDeals = deals.filter((d: any) => !d.name?.startsWith("Shift Revenue"));
            if (visibleDeals.length === 0) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Deals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visibleDeals.map((deal: any) => (
                      <div key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{deal.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {deal.stage && (
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: deal.stage.color }} />
                                {deal.stage.name}
                              </span>
                            )}
                            {deal.expected_close && <span>Close: {new Date(deal.expected_close).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {deal.value > 0 && (
                          <span className="font-semibold text-[#1F3A6A]">${Number(deal.value).toLocaleString()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Emails */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
            </CardTitle>
            {relatedEmails.length > 0 && (
              <span className="text-xs text-muted-foreground">{relatedEmails.length} found</span>
            )}
          </CardHeader>
          <CardContent>
            {relatedEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {contactEmail ? "No emails found for this contact" : "Add a contact email to see related emails"}
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {relatedEmails.map((email: any) => (
                  <div
                    key={email.id}
                    className="rounded-lg border p-3 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/crm/email`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium truncate ${!email.is_read ? "text-[#1F3A6A]" : ""}`}>
                        {email.subject || "(no subject)"}
                      </p>
                      {!email.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {email.from_name || email.from_address}
                    </p>
                    {email.snippet && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.snippet}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(email.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
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
                      <p className="mt-0.5 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {hospital.contact_email && (
        <ComposeEmailDialog
          open={showCompose}
          onOpenChange={setShowCompose}
          recipients={[{
            name: hospital.contact_name || hospital.name,
            email: hospital.contact_email,
            entityId: hospital.id,
          }]}
        />
      )}
    </div>
  );
}
