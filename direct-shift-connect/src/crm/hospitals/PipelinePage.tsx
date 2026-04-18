import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, X, Pencil, DollarSign, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "../shared/logActivity";
import type { PipelineStage, HospitalDeal, Hospital } from "../shared/types";

type DealWithHospital = HospitalDeal & { hospital: { id: string; name: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null } | null };

const SHIFT_DEAL_PREFIX = "Shift Revenue";

interface ShiftInfo {
  shifts: number;
  rate: number;
  revenue: number;
}

function usePipelineData() {
  const stagesQuery = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_pipeline_stages")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as PipelineStage[];
    },
  });

  const dealsQuery = useQuery({
    queryKey: ["pipeline-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_deals")
        .select("*, hospital:hospitals(id, name, contact_name, contact_email, contact_phone)")
        .order("position");
      if (error) throw error;
      return data as DealWithHospital[];
    },
  });

  const hospitalsQuery = useQuery({
    queryKey: ["hospitals-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospitals").select("id, name").order("name");
      if (error) throw error;
      return data as Pick<Hospital, "id" | "name">[];
    },
  });

  const allDeals = dealsQuery.data || [];

  // Separate shift-revenue deals from regular deals
  const shiftByHospitalId = new Map<string, ShiftInfo>();
  const visibleDeals: DealWithHospital[] = [];
  // Track which hospital_ids have multiple deals so we can aggregate revenue
  const dealValuesByHospitalId = new Map<string, number>();

  for (const d of allDeals) {
    if (d.name?.startsWith(SHIFT_DEAL_PREFIX)) {
      const notes = d.notes || "";
      const sm = notes.match(/shifts:(\d+)/);
      const rm = notes.match(/rate:(\d+)/);
      const shifts = sm ? parseInt(sm[1]) : 0;
      const rate = rm ? parseInt(rm[1]) : 99;
      if (d.hospital_id) {
        const existing = shiftByHospitalId.get(d.hospital_id);
        if (existing) {
          existing.shifts += shifts;
          existing.revenue += shifts * rate;
        } else {
          shiftByHospitalId.set(d.hospital_id, { shifts, rate, revenue: shifts * rate });
        }
      }
    } else {
      visibleDeals.push(d);
      // Accumulate non-shift deal values per hospital
      if (d.hospital_id) {
        dealValuesByHospitalId.set(
          d.hospital_id,
          (dealValuesByHospitalId.get(d.hospital_id) || 0) + Number(d.value || 0)
        );
      }
    }
  }

  return {
    stages: stagesQuery.data || [],
    deals: visibleDeals,
    shiftByHospitalId,
    dealValuesByHospitalId,
    hospitals: hospitalsQuery.data || [],
    isLoading: stagesQuery.isLoading || dealsQuery.isLoading,
  };
}

function DealCard({
  deal,
  shiftInfo,
  hospitalTotalDealValue,
  isOverlay,
  onDelete,
  onEdit,
}: {
  deal: DealWithHospital;
  shiftInfo?: ShiftInfo;
  hospitalTotalDealValue?: number;
  isOverlay?: boolean;
  onDelete?: (dealId: string) => void;
  onEdit?: (deal: DealWithHospital) => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: "deal", deal, stageId: deal.stage_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Show this deal's value, but also consider the hospital's total if there are other deals
  const dealValue = Number(deal.value || 0);
  const otherDealsValue = (hospitalTotalDealValue || 0) - dealValue;
  const totalValue = (hospitalTotalDealValue || dealValue) + (shiftInfo?.revenue || 0);

  const displayName = deal.hospital?.name || deal.name;

  if (isOverlay) {
    return (
      <Card className="w-48 rotate-2 shadow-xl border-[#1F3A6A]/20">
        <CardContent className="p-3">
          <p className="text-sm font-medium truncate">{displayName}</p>
          {totalValue > 0 && (
            <p className="mt-1 text-sm font-semibold text-[#1F3A6A]">
              ${totalValue.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => {
        if (deal.hospital) navigate(`/crm/hospitals/${deal.hospital.id}`);
      }}
    >
      <Card className="group mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="mt-1 text-gray-400">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {deal.hospital?.contact_name ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <User className="h-3 w-3 shrink-0" />
                  {deal.hospital.contact_name}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/50 italic">No contact</p>
              )}
              {deal.hospital?.contact_email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {deal.hospital.contact_email}
                </p>
              )}
              {/* Deal value */}
              {dealValue > 0 && (
                <p className="mt-1 text-sm font-semibold text-[#1F3A6A]">
                  ${dealValue.toLocaleString()}
                  {(shiftInfo || otherDealsValue > 0) && <span className="text-xs font-normal text-muted-foreground ml-1">deal</span>}
                </p>
              )}
              {/* Other deals revenue for same hospital */}
              {otherDealsValue > 0 && (
                <p className="text-xs font-medium text-[#1F3A6A]/70">
                  + ${otherDealsValue.toLocaleString()} other deals
                </p>
              )}
              {/* Shift revenue merged in */}
              {shiftInfo && shiftInfo.shifts > 0 && (
                <p className="text-xs font-medium text-purple-600">
                  + {shiftInfo.shifts} shifts × ${shiftInfo.rate} = ${shiftInfo.revenue.toLocaleString()}
                </p>
              )}
              {/* Combined total if multiple revenue sources */}
              {totalValue > 0 && (dealValue !== totalValue) && (
                <p className="text-xs font-semibold text-green-600 border-t border-gray-100 mt-1 pt-1">
                  Total: ${totalValue.toLocaleString()}
                </p>
              )}
              {deal.expected_close && (
                <p className="text-xs text-muted-foreground">
                  Close: {new Date(deal.expected_close).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  className="p-0.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(deal);
                  }}
                  title="Edit deal"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(deal.id);
                  }}
                  title="Delete deal"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineColumn({
  stage,
  deals,
  shiftByHospitalId,
  dealValuesByHospitalId,
  onAddDeal,
  onDeleteDeal,
  onEditDeal,
  isOver,
}: {
  stage: PipelineStage;
  deals: DealWithHospital[];
  shiftByHospitalId: Map<string, ShiftInfo>;
  dealValuesByHospitalId: Map<string, number>;
  onAddDeal: (stageId: string) => void;
  onDeleteDeal: (dealId: string) => void;
  onEditDeal: (deal: DealWithHospital) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: "stage", stageId: stage.id },
  });

  const totalValue = deals.reduce((sum, d) => {
    const shiftRev = d.hospital_id ? (shiftByHospitalId.get(d.hospital_id)?.revenue || 0) : 0;
    return sum + Number(d.value || 0) + shiftRev;
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-1 flex-col rounded-lg p-2 transition-colors ${
        isOver ? "bg-blue-50 ring-2 ring-blue-300" : "bg-gray-100"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-xs font-semibold truncate">{stage.name}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
            {deals.length}
          </span>
        </div>
      </div>
      {totalValue > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">${totalValue.toLocaleString()}</p>
      )}

      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-h-[60px] space-y-0 overflow-y-auto">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              shiftInfo={deal.hospital_id ? shiftByHospitalId.get(deal.hospital_id) : undefined}
              hospitalTotalDealValue={deal.hospital_id ? dealValuesByHospitalId.get(deal.hospital_id) : undefined}
              onDelete={onDeleteDeal}
              onEdit={onEditDeal}
            />
          ))}
        </div>
      </SortableContext>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start text-muted-foreground"
        onClick={() => onAddDeal(stage.id)}
      >
        <Plus className="mr-1 h-4 w-4" /> Add deal
      </Button>
    </div>
  );
}

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { stages, deals, shiftByHospitalId, dealValuesByHospitalId, hospitals, isLoading } = usePipelineData();
  const [activeDeal, setActiveDeal] = useState<DealWithHospital | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [addToStageId, setAddToStageId] = useState<string | null>(null);
  const [editingDeal, setEditingDeal] = useState<DealWithHospital | null>(null);

  // Local optimistic state for deals during drag
  const [localDeals, setLocalDeals] = useState<DealWithHospital[] | null>(null);
  const displayDeals = localDeals || deals;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const moveDeal = useMutation({
    mutationFn: async ({ dealId, stageId, position }: { dealId: string; stageId: string; position: number }) => {
      const { error } = await supabase
        .from("hospital_deals")
        .update({ stage_id: stageId, position })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from("hospital_deals").delete().eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Deal removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteHospitalEverywhere = useMutation({
    mutationFn: async (hospitalId: string) => {
      // Cascade: delete all deals for the hospital, then the hospital row
      const { error: dealsErr } = await supabase
        .from("hospital_deals")
        .delete()
        .eq("hospital_id", hospitalId);
      if (dealsErr) throw dealsErr;
      const { error } = await supabase
        .from("hospitals")
        .delete()
        .eq("id", hospitalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      toast.success("Hospital deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDeleteDeal = useCallback(
    (dealId: string) => {
      const deal = deals.find((d) => d.id === dealId);
      const hospital = deal?.hospital;
      const hospitalName = hospital?.name || deal?.name || "this hospital";

      if (hospital?.id) {
        // Offer two choices: delete just the deal, or delete the hospital entirely
        const msg =
          `Delete "${hospitalName}"?\n\n` +
          `OK = permanently delete the hospital and ALL its pipeline deals\n` +
          `Cancel = keep the hospital (this does nothing)\n\n` +
          `To just move the deal to a different stage, drag it instead.`;
        if (window.confirm(msg)) {
          deleteHospitalEverywhere.mutate(hospital.id);
        }
      } else {
        // Orphan deal (no hospital linked) — delete just the deal
        if (window.confirm(`Remove "${hospitalName}" from the pipeline?`)) {
          deleteDeal.mutate(dealId);
        }
      }
    },
    [deleteDeal, deleteHospitalEverywhere, deals],
  );

  const addDeal = useMutation({
    mutationFn: async (deal: Partial<HospitalDeal>) => {
      const { error } = await supabase.from("hospital_deals").insert(deal);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      setShowAddDeal(false);
      toast.success("Deal added");
      logActivity({
        module: "hospitals",
        entityId: (variables as any).hospital_id || undefined,
        action: "deal_added",
        summary: `Added deal: ${(variables as any).name || "New deal"}`,
        metadata: { value: (variables as any).value },
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateDeal = useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: string; updates: Partial<HospitalDeal> }) => {
      const { error } = await supabase
        .from("hospital_deals")
        .update(updates)
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setEditingDeal(null);
      toast.success("Deal updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const findStageIdFromOver = useCallback(
    (overId: string | number): string | null => {
      // Check if it's a stage droppable
      const stagePrefix = "stage-";
      const overStr = String(overId);
      if (overStr.startsWith(stagePrefix)) {
        return overStr.slice(stagePrefix.length);
      }
      // It's a deal — find its stage
      const overDeal = displayDeals.find((d) => d.id === overId);
      return overDeal?.stage_id || null;
    },
    [displayDeals],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    if (deal) {
      setActiveDeal(deal);
      setLocalDeals([...deals]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localDeals) return;

    const activeId = active.id as string;
    const targetStageId = findStageIdFromOver(over.id);
    if (!targetStageId) return;

    setOverStageId(targetStageId);

    // Optimistically move the card to the new column
    const activeDealData = localDeals.find((d) => d.id === activeId);
    if (!activeDealData || activeDealData.stage_id === targetStageId) return;

    setLocalDeals(
      localDeals.map((d) => (d.id === activeId ? { ...d, stage_id: targetStageId } : d)),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    setOverStageId(null);

    if (!over) {
      setLocalDeals(null);
      return;
    }

    const dealId = active.id as string;
    const targetStageId = findStageIdFromOver(over.id);

    if (targetStageId) {
      const stageDeals = (localDeals || deals).filter(
        (d) => d.stage_id === targetStageId && d.id !== dealId,
      );
      const movedDeal = deals.find((d) => d.id === dealId);
      const targetStage = stages.find((s) => s.id === targetStageId);
      moveDeal.mutate({ dealId, stageId: targetStageId, position: stageDeals.length });

      if (movedDeal && targetStage) {
        const hospitalName = movedDeal.hospital?.name || movedDeal.name;
        logActivity({
          module: "hospitals",
          entityId: movedDeal.hospital_id || undefined,
          action: "deal_moved",
          summary: `Moved ${hospitalName} to ${targetStage.name}`,
          metadata: { stage: targetStage.name, dealId },
        });
        queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      }
    }

    setLocalDeals(null);
  };

  const handleDragCancel = () => {
    setActiveDeal(null);
    setOverStageId(null);
    setLocalDeals(null);
  };

  const handleAddDeal = (stageId: string) => {
    setAddToStageId(stageId);
    setShowAddDeal(true);
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addDeal.mutate({
      name: form.get("name") as string,
      hospital_id: form.get("hospital_id") as string,
      value: parseFloat((form.get("value") as string) || "0"),
      stage_id: addToStageId!,
      expected_close: (form.get("expected_close") as string) || null,
      notes: (form.get("notes") as string) || null,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading pipeline...</div>;
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-2 pb-4">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              deals={displayDeals
                .filter((d) => d.stage_id === stage.id)
                .sort((a, b) => (a.hospital?.name || a.name).localeCompare(b.hospital?.name || b.name))}
              shiftByHospitalId={shiftByHospitalId}
              dealValuesByHospitalId={dealValuesByHospitalId}
              onAddDeal={handleAddDeal}
              onDeleteDeal={handleDeleteDeal}
              onEditDeal={setEditingDeal}
              isOver={overStageId === stage.id}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDeal && <DealCard deal={activeDeal} isOverlay />}
        </DragOverlay>
      </DndContext>

      <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal-name">Deal Name *</Label>
              <Input id="deal-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital_id">Hospital *</Label>
              <Select name="hospital_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-value">Value ($)</Label>
              <Input id="deal-value" name="value" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_close">Expected Close</Label>
              <Input id="expected_close" name="expected_close" type="date" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDeal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90" disabled={addDeal.isPending}>
                {addDeal.isPending ? "Adding..." : "Add Deal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Deal dialog */}
      <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#1F3A6A]" />
              Edit Deal
            </DialogTitle>
          </DialogHeader>
          {editingDeal && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                updateDeal.mutate({
                  dealId: editingDeal.id,
                  updates: {
                    name: form.get("name") as string,
                    value: parseFloat((form.get("value") as string) || "0"),
                    stage_id: form.get("stage_id") as string,
                    expected_close: (form.get("expected_close") as string) || null,
                    notes: (form.get("notes") as string) || null,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Deal Name</Label>
                <Input name="name" defaultValue={editingDeal.name} required />
              </div>
              <div className="space-y-2">
                <Label>Hospital</Label>
                <Input value={editingDeal.hospital?.name || "—"} disabled className="bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pipeline Cost / Value ($)</Label>
                  <Input name="value" type="number" step="0.01" defaultValue={editingDeal.value || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select name="stage_id" defaultValue={editingDeal.stage_id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expected Close</Label>
                <Input name="expected_close" type="date" defaultValue={editingDeal.expected_close || ""} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input name="notes" defaultValue={editingDeal.notes || ""} placeholder="Revenue notes, cost details..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingDeal(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1F3A6A] hover:bg-[#1F3A6A]/90" disabled={updateDeal.isPending}>
                  {updateDeal.isPending ? "Saving..." : "Save Deal"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
