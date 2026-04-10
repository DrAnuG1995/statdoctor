import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "../shared/components/PageHeader";
import {
  AlertTriangle,
  CheckSquare,
  FileCheck,
  FileText,
  UserCheck,
  ExternalLink,
  Clock,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import type { Doctor } from "../shared/types";

function getUnverifiedDocCount(notes: string | null): number {
  const match = notes?.match(/\[UNVERIFIED_DOCS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : 0;
}

function getUnverifiedRefCount(notes: string | null): number {
  const match = notes?.match(/\[UNVERIFIED_REFS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : 0;
}

type DoctorWithCounts = Pick<Doctor, "id" | "full_name" | "notes" | "specialities" | "skill_level" | "email"> & {
  unverifiedDocs: number;
  unverifiedRefs: number;
};

function useDoctorsWithUnverified() {
  return useQuery({
    queryKey: ["doctors-unverified-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name, notes, specialities, skill_level, email")
        .not("status", "eq", "deleted");
      if (error) throw error;
      return (data as Pick<Doctor, "id" | "full_name" | "notes" | "specialities" | "skill_level" | "email">[])
        .map((d) => ({
          ...d,
          unverifiedDocs: getUnverifiedDocCount(d.notes),
          unverifiedRefs: getUnverifiedRefCount(d.notes),
        }))
        .filter((d) => d.unverifiedDocs > 0 || d.unverifiedRefs > 0)
        .sort((a, b) => (b.unverifiedDocs + b.unverifiedRefs) - (a.unverifiedDocs + a.unverifiedRefs));
    },
  });
}

function TaskCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  badgeBg,
  badgeColor,
  emptyMessage,
  doctors,
  loading,
  renderItem,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge: string | null;
  badgeBg: string;
  badgeColor: string;
  emptyMessage: string;
  doctors: DoctorWithCounts[];
  loading: boolean;
  renderItem: (doctor: DoctorWithCounts) => React.ReactNode;
}) {
  const isEmpty = !loading && doctors.length === 0;

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="p-5 border-b bg-gray-50/50">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              {badge && (
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeBg} ${badgeColor}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isEmpty ? emptyMessage : subtitle}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="p-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <FileCheck className="h-6 w-6 text-green-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-green-700">All clear!</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {!loading && doctors.length > 0 && (
        <div className="divide-y">
          {doctors.map((doctor) => renderItem(doctor))}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const navigate = useNavigate();
  const { data: doctors = [], isLoading } = useDoctorsWithUnverified();

  const docsOnly = doctors.filter((d) => d.unverifiedDocs > 0);
  const refsOnly = doctors.filter((d) => d.unverifiedRefs > 0);
  const totalDocs = docsOnly.reduce((sum, d) => sum + d.unverifiedDocs, 0);
  const totalRefs = refsOnly.reduce((sum, d) => sum + d.unverifiedRefs, 0);
  const totalDoctors = doctors.length;

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Verification tasks and action items"
      />

      {/* Summary banner */}
      {!isLoading && totalDoctors > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                {totalDoctors} doctor{totalDoctors !== 1 ? "s" : ""} awaiting verification
              </h3>
              <p className="text-sm text-amber-700">
                {totalDocs > 0 && <span>{totalDocs} document{totalDocs !== 1 ? "s" : ""}</span>}
                {totalDocs > 0 && totalRefs > 0 && <span> and </span>}
                {totalRefs > 0 && <span>{totalRefs} reference{totalRefs !== 1 ? "s" : ""}</span>}
                {" "}need your review on the{" "}
                <a
                  href="https://admin.statdoctor.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
                >
                  Admin Portal <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-center">
              <div className="px-4 border-r border-amber-200">
                <div className="text-2xl font-bold text-amber-800">{totalDocs}</div>
                <div className="text-xs text-amber-600">Docs</div>
              </div>
              <div className="px-4">
                <div className="text-2xl font-bold text-amber-800">{totalRefs}</div>
                <div className="text-xs text-amber-600">Refs</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && totalDoctors === 0 && (
        <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckSquare className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="mt-3 font-semibold text-green-900">All caught up!</h3>
          <p className="mt-1 text-sm text-green-700">No outstanding verification tasks. Great work.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unverified Documents */}
        <TaskCard
          icon={FileText}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="Unverified Documents"
          subtitle={`${docsOnly.length} doctor${docsOnly.length !== 1 ? "s" : ""} with ${totalDocs} document${totalDocs !== 1 ? "s" : ""} pending verification`}
          badge={docsOnly.length > 0 ? `${docsOnly.length}` : null}
          badgeBg="bg-amber-100"
          badgeColor="text-amber-700"
          emptyMessage="All documents have been verified"
          doctors={docsOnly.sort((a, b) => b.unverifiedDocs - a.unverifiedDocs)}
          loading={isLoading}
          renderItem={(doctor) => (
            <button
              key={doctor.id}
              onClick={() => navigate(`/crm/doctors/${doctor.id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-amber-50/60 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">
                  {doctor.unverifiedDocs}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {doctor.full_name}
                    </span>
                    {doctor.skill_level && (
                      <span className="hidden sm:inline shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-muted-foreground">
                        {doctor.skill_level}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{doctor.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {doctor.unverifiedDocs} doc{doctor.unverifiedDocs !== 1 ? "s" : ""}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </button>
          )}
        />

        {/* Unverified References */}
        <TaskCard
          icon={UserCheck}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="Unverified References"
          subtitle={`${refsOnly.length} doctor${refsOnly.length !== 1 ? "s" : ""} with ${totalRefs} reference${totalRefs !== 1 ? "s" : ""} pending verification`}
          badge={refsOnly.length > 0 ? `${refsOnly.length}` : null}
          badgeBg="bg-blue-100"
          badgeColor="text-blue-700"
          emptyMessage="All references have been verified"
          doctors={refsOnly.sort((a, b) => b.unverifiedRefs - a.unverifiedRefs)}
          loading={isLoading}
          renderItem={(doctor) => (
            <button
              key={doctor.id}
              onClick={() => navigate(`/crm/doctors/${doctor.id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-blue-50/60 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  {doctor.unverifiedRefs}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {doctor.full_name}
                    </span>
                    {doctor.skill_level && (
                      <span className="hidden sm:inline shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-muted-foreground">
                        {doctor.skill_level}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{doctor.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {doctor.unverifiedRefs} ref{doctor.unverifiedRefs !== 1 ? "s" : ""}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </button>
          )}
        />
      </div>

      {/* Sync info */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Data synced automatically every 6 hours from the admin portal</span>
      </div>
    </div>
  );
}
