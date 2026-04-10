import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  UserPlus,
  FileCheck,
  Users,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { Doctor } from "../shared/types";

type PipelineStage =
  | "registered"
  | "docs_uploaded"
  | "refs_verified"
  | "ready";

interface StageConfig {
  key: PipelineStage;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const STAGES: StageConfig[] = [
  {
    key: "registered",
    label: "Registered",
    icon: UserPlus,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "Signed up, no documents or references yet",
  },
  {
    key: "docs_uploaded",
    label: "Documents Uploaded",
    icon: FileCheck,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Documents submitted, references pending",
  },
  {
    key: "refs_verified",
    label: "References Complete",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "References verified, documents pending",
  },
  {
    key: "ready",
    label: "Ready to Work",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Fully onboarded, ready for shifts",
  },
];

function getDoctorStage(doctor: Doctor): PipelineStage {
  const hasDocs = doctor.has_documents;
  const hasRefs = doctor.has_references;

  if (hasDocs && hasRefs) return "ready";
  if (hasDocs && !hasRefs) return "docs_uploaded";
  if (!hasDocs && hasRefs) return "refs_verified";
  return "registered";
}

function getDaysSinceRegistration(doctor: Doctor): number | null {
  const regDate = doctor.registered_date;
  if (!regDate) return null;
  const diff = Date.now() - new Date(regDate).getTime();
  return Math.floor(diff / 86400000);
}

function formatRegDate(dateStr: string | null) {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function usePipelineDoctors(search: string) {
  return useQuery({
    queryKey: ["onboarding-pipeline", search],
    queryFn: async () => {
      let query = supabase
        .from("doctors")
        .select("*")
        .eq("status", "active")
        .order("registered_date", { ascending: false })
        .range(0, 999);

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Doctor[];
    },
  });
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const navigate = useNavigate();
  const daysSince = getDaysSinceRegistration(doctor);
  const isStale = daysSince !== null && daysSince > 7;
  const stage = getDoctorStage(doctor);

  return (
    <div
      onClick={() => navigate(`/crm/doctors/${doctor.id}`)}
      className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-[#1F3A6A]/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1F3A6A]">
            {doctor.full_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {doctor.email || "No email"}
          </p>
        </div>
        {isStale && stage === "registered" && (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" title="Stale - registered over 7 days ago" />
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRegDate(doctor.registered_date)}
        </div>
        {doctor.skill_level && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium">
            {doctor.skill_level}
          </span>
        )}
      </div>

      {/* Progress indicators */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-1" title="Documents">
          <FileCheck
            className={`h-3.5 w-3.5 ${doctor.has_documents ? "text-green-500" : "text-gray-300"}`}
          />
        </div>
        <div className="flex items-center gap-1" title="References">
          <Users
            className={`h-3.5 w-3.5 ${doctor.has_references ? "text-green-500" : "text-gray-300"}`}
          />
        </div>
        <div className="flex items-center gap-1" title="AHPRA">
          <ShieldCheck
            className={`h-3.5 w-3.5 ${doctor.ahpra_number ? "text-green-500" : "text-gray-300"}`}
          />
        </div>
      </div>
    </div>
  );
}

function StageColumn({ stage, doctors }: { stage: StageConfig; doctors: Doctor[] }) {
  const Icon = stage.icon;
  return (
    <div className={`flex min-h-[500px] flex-col rounded-xl border ${stage.borderColor} ${stage.bgColor}`}>
      <div className="flex items-center gap-2 border-b border-inherit px-4 py-3">
        <Icon className={`h-5 w-5 ${stage.color}`} />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{stage.label}</h3>
          <p className="text-[10px] text-muted-foreground">{stage.description}</p>
        </div>
        <span
          className={`flex h-6 min-w-[24px] items-center justify-center rounded-full text-xs font-bold text-white ${
            stage.key === "ready"
              ? "bg-green-600"
              : stage.key === "registered"
                ? "bg-orange-500"
                : stage.key === "docs_uploaded"
                  ? "bg-blue-500"
                  : "bg-purple-500"
          }`}
        >
          {doctors.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 350px)" }}>
        {doctors.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No doctors in this stage
          </p>
        ) : (
          doctors.map((doc) => <DoctorCard key={doc.id} doctor={doc} />)
        )}
      </div>
    </div>
  );
}

export default function OnboardingPipeline() {
  const [search, setSearch] = useState("");
  const { data: doctors = [], isLoading } = usePipelineDoctors(search);

  const grouped = useMemo(() => {
    const groups: Record<PipelineStage, Doctor[]> = {
      registered: [],
      docs_uploaded: [],
      refs_verified: [],
      ready: [],
    };

    for (const doc of doctors) {
      const stage = getDoctorStage(doc);
      groups[stage].push(doc);
    }

    return groups;
  }, [doctors]);

  const totalActive = doctors.length;
  const readyCount = grouped.ready.length;
  const conversionRate =
    totalActive > 0 ? Math.round((readyCount / totalActive) * 100) : 0;
  const staleCount = grouped.registered.filter((d) => {
    const days = getDaysSinceRegistration(d);
    return days !== null && days > 7;
  }).length;

  return (
    <div>
      {/* Summary metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-orange-100 p-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{grouped.registered.length}</p>
              <p className="text-xs text-muted-foreground">Awaiting docs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{readyCount}</p>
              <p className="text-xs text-muted-foreground">Ready to work</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-[#1F3A6A]/10 p-2">
              <ChevronRight className="h-5 w-5 text-[#1F3A6A]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Conversion rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{staleCount}</p>
              <p className="text-xs text-muted-foreground">Stale (7+ days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion funnel bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Onboarding funnel
            </span>
            <span className="text-xs text-muted-foreground">
              {readyCount} of {totalActive} fully onboarded
            </span>
          </div>
          <div className="flex h-6 w-full overflow-hidden rounded-full bg-gray-100">
            {totalActive > 0 && (
              <>
                <div
                  className="flex items-center justify-center bg-green-500 text-[10px] font-bold text-white transition-all"
                  style={{
                    width: `${(grouped.ready.length / totalActive) * 100}%`,
                  }}
                  title={`Ready: ${grouped.ready.length}`}
                >
                  {grouped.ready.length > 0 && grouped.ready.length}
                </div>
                <div
                  className="flex items-center justify-center bg-purple-400 text-[10px] font-bold text-white transition-all"
                  style={{
                    width: `${(grouped.refs_verified.length / totalActive) * 100}%`,
                  }}
                  title={`Refs: ${grouped.refs_verified.length}`}
                >
                  {grouped.refs_verified.length > 0 &&
                    grouped.refs_verified.length}
                </div>
                <div
                  className="flex items-center justify-center bg-blue-400 text-[10px] font-bold text-white transition-all"
                  style={{
                    width: `${(grouped.docs_uploaded.length / totalActive) * 100}%`,
                  }}
                  title={`Docs: ${grouped.docs_uploaded.length}`}
                >
                  {grouped.docs_uploaded.length > 0 &&
                    grouped.docs_uploaded.length}
                </div>
                <div
                  className="flex items-center justify-center bg-orange-300 text-[10px] font-bold text-orange-800 transition-all"
                  style={{
                    width: `${(grouped.registered.length / totalActive) * 100}%`,
                  }}
                  title={`Registered: ${grouped.registered.length}`}
                >
                  {grouped.registered.length > 0 && grouped.registered.length}
                </div>
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Ready
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> Refs
              verified
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Docs
              uploaded
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-300" /> Registered
              only
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Kanban columns */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.key}
              stage={stage}
              doctors={grouped[stage.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
