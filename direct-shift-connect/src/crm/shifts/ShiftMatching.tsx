import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Clock,
  MapPin,
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  FileCheck,
  Users,
  ShieldCheck,
  Star,
  ChevronRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import type { Shift, Doctor } from "../shared/types";

// ── Skill level hierarchy (lowest → highest) ────────────────────────

const SKILL_RANK: Record<string, number> = {
  "Pgy2+": 1,
  "Pgy3+": 2,
  "Pgy4+": 3,
  Registrar: 4,
  "VMO/SMO": 5,
  Consultant: 6,
};

function skillMeetsRequirement(
  doctorSkill: string | null,
  shiftSkill: string | null
): boolean {
  if (!shiftSkill) return true; // no requirement
  if (!doctorSkill) return false;
  const dRank = SKILL_RANK[doctorSkill] ?? 0;
  const sRank = SKILL_RANK[shiftSkill] ?? 0;
  return dRank >= sRank;
}

function skillExactMatch(
  doctorSkill: string | null,
  shiftSkill: string | null
): boolean {
  if (!shiftSkill && !doctorSkill) return true;
  return doctorSkill === shiftSkill;
}

// ── Match scoring ────────────────────────────────────────────────────

interface MatchResult {
  doctor: Doctor;
  score: number;
  maxScore: number;
  reasons: MatchReason[];
}

interface MatchReason {
  label: string;
  met: boolean;
  weight: number;
  detail?: string;
}

function scoreDoctor(doctor: Doctor, shift: Shift): MatchResult | null {
  // Hard filter 1: if the shift requires a specialty, the doctor MUST have it listed
  const shiftSpec = shift.specialty?.toLowerCase();
  const docSpecs = (doctor.specialities || []).map((s) => s.toLowerCase());
  if (shiftSpec && !docSpecs.includes(shiftSpec)) {
    return null; // ineligible — wrong specialty
  }

  // Hard filter 2: if the shift requires a skill level, the doctor must meet or exceed it
  if (shift.skill_level && !skillMeetsRequirement(doctor.skill_level, shift.skill_level)) {
    return null; // ineligible — skill level too low
  }

  const reasons: MatchReason[] = [];

  // 1. Skill level (always met here since we hard-filtered above)
  const skillExact = skillExactMatch(doctor.skill_level, shift.skill_level);
  reasons.push({
    label: "Skill level",
    met: true,
    weight: 30,
    detail: skillExact
      ? `Exact match: ${doctor.skill_level}`
      : shift.skill_level
        ? `${doctor.skill_level} meets ${shift.skill_level} requirement`
        : `${doctor.skill_level || "Any level"}`,
  });

  // 2. Specialty match (always met here since we hard-filtered above)
  reasons.push({
    label: "Specialty",
    met: true,
    weight: 25,
    detail: shiftSpec
      ? `Has ${shift.specialty}`
      : "No specialty required",
  });

  // 3. Documents uploaded
  reasons.push({
    label: "Documents",
    met: doctor.has_documents,
    weight: 15,
    detail: doctor.has_documents ? "Documents on file" : "No documents",
  });

  // 4. References verified
  reasons.push({
    label: "References",
    met: doctor.has_references,
    weight: 15,
    detail: doctor.has_references
      ? "References verified"
      : "References pending",
  });

  // 5. AHPRA number
  const hasAhpra = !!doctor.ahpra_number;
  reasons.push({
    label: "AHPRA",
    met: hasAhpra,
    weight: 10,
    detail: hasAhpra ? `AHPRA: ${doctor.ahpra_number}` : "No AHPRA number",
  });

  // 6. No AHPRA restrictions
  const noRestrictions = !doctor.ahpra_restrictions;
  reasons.push({
    label: "No restrictions",
    met: noRestrictions,
    weight: 5,
    detail: noRestrictions ? "No restrictions" : "Has AHPRA restrictions",
  });

  const score = reasons.reduce((s, r) => s + (r.met ? r.weight : 0), 0);
  const maxScore = reasons.reduce((s, r) => s + r.weight, 0);

  return { doctor, score, maxScore, reasons };
}

// ── Data hooks ───────────────────────────────────────────────────────

function useActiveShifts(hospitalFilter: string) {
  return useQuery({
    queryKey: ["matching-active-shifts", hospitalFilter],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select("*")
        .eq("status", "Active")
        .order("start_time", { ascending: true })
        .range(0, 1999);

      if (hospitalFilter && hospitalFilter !== "all") {
        query = query.eq("hospital_name", hospitalFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shift[];
    },
  });
}

function useActiveDoctors() {
  return useQuery({
    queryKey: ["matching-active-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Doctor[];
    },
  });
}

function useShiftHospitals() {
  return useQuery({
    queryKey: ["matching-hospitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("hospital_name")
        .eq("status", "Active")
        .range(0, 1999);
      if (error) throw error;
      return [...new Set(data.map((d) => d.hospital_name).filter(Boolean))].sort();
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Score badge ──────────────────────────────────────────────────────

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color =
    pct >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : pct >= 50
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-red-100 text-red-700 border-red-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}
    >
      <Star className="h-3 w-3" />
      {pct}%
    </span>
  );
}

// ── Shift card (left panel) ──────────────────────────────────────────

function ShiftCard({
  shift,
  isSelected,
  matchCount,
  onClick,
}: {
  shift: Shift;
  isSelected: boolean;
  matchCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-[#1F3A6A] bg-[#1F3A6A]/5 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="truncate text-sm font-semibold">{shift.hospital_name}</p>
          </div>
          {shift.hospital_location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {shift.hospital_location.replace(", Australia", "").trim()}
            </p>
          )}
        </div>
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? "text-[#1F3A6A]" : "text-muted-foreground"}`}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(shift.start_time)} {formatTime(shift.start_time)}
        </span>
        <span className="font-semibold text-green-700">${shift.rate_per_hour}/hr</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {shift.specialty && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            {shift.specialty}
          </span>
        )}
        {shift.skill_level && (
          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
            {shift.skill_level}
          </span>
        )}
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {matchCount} match{matchCount !== 1 ? "es" : ""}
        </span>
      </div>
    </button>
  );
}

// ── Doctor match row (right panel) ───────────────────────────────────

function DoctorMatchRow({
  match,
  rank,
}: {
  match: MatchResult;
  rank: number;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const doc = match.doctor;
  const pct = match.maxScore > 0 ? Math.round((match.score / match.maxScore) * 100) : 0;

  return (
    <div className="rounded-lg border bg-white transition-all hover:shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* Rank */}
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            rank <= 3 ? "bg-[#1F3A6A]" : "bg-gray-400"
          }`}
        >
          {rank}
        </div>

        {/* Doctor info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1F3A6A]">
            {doc.full_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {doc.email || "No email"}
            {doc.skill_level && ` · ${doc.skill_level}`}
          </p>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1.5">
          <FileCheck
            className={`h-3.5 w-3.5 ${doc.has_documents ? "text-green-500" : "text-gray-300"}`}
            title={doc.has_documents ? "Documents on file" : "No documents"}
          />
          <Users
            className={`h-3.5 w-3.5 ${doc.has_references ? "text-green-500" : "text-gray-300"}`}
            title={doc.has_references ? "References verified" : "References pending"}
          />
          <ShieldCheck
            className={`h-3.5 w-3.5 ${doc.ahpra_number ? "text-green-500" : "text-gray-300"}`}
            title={doc.ahpra_number ? `AHPRA: ${doc.ahpra_number}` : "No AHPRA"}
          />
        </div>

        {/* Score */}
        <ScoreBadge score={match.score} max={match.maxScore} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2">
          {/* Match breakdown */}
          <div className="space-y-1.5">
            {match.reasons.map((r) => (
              <div key={r.label} className="flex items-center gap-2 text-xs">
                {r.met ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">— {r.detail}</span>
                <span className="ml-auto text-muted-foreground">
                  {r.met ? r.weight : 0}/{r.weight}
                </span>
              </div>
            ))}
          </div>

          {/* Specialties */}
          {doc.specialities?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {doc.specialities.map((s) => (
                <span
                  key={s}
                  className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* AHPRA restrictions warning */}
          {doc.ahpra_restrictions && (
            <div className="mt-2 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Has AHPRA restrictions — review before assigning
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigate(`/crm/doctors/${doc.id}`)}
              className="rounded-md bg-[#1F3A6A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1F3A6A]/90"
            >
              View Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function ShiftMatching() {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const [shiftSearch, setShiftSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [minScore, setMinScore] = useState("all");

  const { data: shifts = [], isLoading: loadingShifts } = useActiveShifts(hospitalFilter);
  const { data: doctors = [], isLoading: loadingDoctors } = useActiveDoctors();
  const { data: hospitals = [] } = useShiftHospitals();

  // Filter shifts by search
  const filteredShifts = useMemo(() => {
    if (!shiftSearch) return shifts;
    const q = shiftSearch.toLowerCase();
    return shifts.filter(
      (s) =>
        s.hospital_name.toLowerCase().includes(q) ||
        s.specialty?.toLowerCase().includes(q) ||
        s.hospital_location?.toLowerCase().includes(q)
    );
  }, [shifts, shiftSearch]);

  const selectedShift = useMemo(
    () => shifts.find((s) => s.id === selectedShiftId) ?? null,
    [shifts, selectedShiftId]
  );

  // Score & rank all doctors against selected shift
  const matches = useMemo(() => {
    if (!selectedShift) return [];
    let results = doctors
      .map((doc) => scoreDoctor(doc, selectedShift))
      .filter((m): m is MatchResult => m !== null);

    // Filter by doctor search
    if (doctorSearch) {
      const q = doctorSearch.toLowerCase();
      results = results.filter(
        (m) =>
          m.doctor.full_name.toLowerCase().includes(q) ||
          m.doctor.email?.toLowerCase().includes(q) ||
          m.doctor.skill_level?.toLowerCase().includes(q)
      );
    }

    // Filter by minimum score
    if (minScore !== "all") {
      const threshold = parseInt(minScore, 10);
      results = results.filter(
        (m) => m.maxScore > 0 && (m.score / m.maxScore) * 100 >= threshold
      );
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }, [selectedShift, doctors, doctorSearch, minScore]);

  // Pre-compute match counts for shift cards
  const shiftMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const shift of shifts) {
      let count = 0;
      for (const doc of doctors) {
        const res = scoreDoctor(doc, shift);
        if (res && res.maxScore > 0 && (res.score / res.maxScore) * 100 >= 50) {
          count++;
        }
      }
      counts[shift.id] = count;
    }
    return counts;
  }, [shifts, doctors]);

  // Auto-select first shift
  if (!selectedShiftId && filteredShifts.length > 0) {
    setSelectedShiftId(filteredShifts[0].id);
  }

  const goodMatches = matches.filter(
    (m) => m.maxScore > 0 && (m.score / m.maxScore) * 100 >= 80
  ).length;
  const okMatches = matches.filter(
    (m) =>
      m.maxScore > 0 &&
      (m.score / m.maxScore) * 100 >= 50 &&
      (m.score / m.maxScore) * 100 < 80
  ).length;

  return (
    <div>
      {/* Summary */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          <Zap className="h-3 w-3" />
          {shifts.length} open shift{shifts.length !== 1 ? "s" : ""}
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          {doctors.length} active doctor{doctors.length !== 1 ? "s" : ""}
        </span>
        {selectedShift && (
          <>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">
              {goodMatches} strong match{goodMatches !== 1 ? "es" : ""}, {okMatches} possible
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left panel: open shifts */}
        <div className="lg:col-span-4">
          <div className="mb-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={shiftSearch}
                onChange={(e) => setShiftSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All hospitals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hospitals</SelectItem>
                {hospitals.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="space-y-2 overflow-y-auto pr-1"
            style={{ maxHeight: "calc(100vh - 380px)" }}
          >
            {loadingShifts ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading shifts...
              </p>
            ) : filteredShifts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No open shifts found
              </p>
            ) : (
              filteredShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  isSelected={shift.id === selectedShiftId}
                  matchCount={shiftMatchCounts[shift.id] ?? 0}
                  onClick={() => setSelectedShiftId(shift.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel: matching doctors */}
        <div className="lg:col-span-8">
          {!selectedShift ? (
            <Card>
              <CardContent className="flex h-[400px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Select a shift to see matching doctors
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selected shift detail */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#1F3A6A]">
                        {selectedShift.hospital_name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {selectedShift.hospital_location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {selectedShift.hospital_location
                              .replace(", Australia", "")
                              .trim()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(selectedShift.start_time)}{" "}
                          {formatTime(selectedShift.start_time)} –{" "}
                          {formatTime(selectedShift.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-semibold text-green-700">
                            ${selectedShift.rate_per_hour}/hr
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {selectedShift.specialty && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {selectedShift.specialty}
                        </span>
                      )}
                      {selectedShift.skill_level && (
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Requires: {selectedShift.skill_level}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Doctor filters */}
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={minScore} onValueChange={setMinScore}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Min match %" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All doctors</SelectItem>
                    <SelectItem value="80">80%+ (Strong)</SelectItem>
                    <SelectItem value="50">50%+ (Possible)</SelectItem>
                    <SelectItem value="30">30%+ (Weak)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results */}
              <div
                className="space-y-2 overflow-y-auto pr-1"
                style={{ maxHeight: "calc(100vh - 480px)" }}
              >
                {loadingDoctors ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Loading doctors...
                  </p>
                ) : matches.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      No matching doctors found. Try lowering the minimum match
                      threshold.
                    </CardContent>
                  </Card>
                ) : (
                  matches.map((match, i) => (
                    <DoctorMatchRow
                      key={match.doctor.id}
                      match={match}
                      rank={i + 1}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
