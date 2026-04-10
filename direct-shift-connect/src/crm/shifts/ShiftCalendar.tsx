import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  MapPin,
  DollarSign,
  User,
  Users,
  CalendarClock,
} from "lucide-react";
import type { Shift } from "../shared/types";

// ── helpers ──────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isToday(d: Date) {
  return isSameDay(d, new Date());
}
function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500",
  Confirmed: "bg-blue-500",
  Archived: "bg-gray-400",
  "Cancelled Doctor": "bg-red-400",
  "Cancelled Hospital": "bg-orange-400",
};

const STATUS_DOT: Record<string, string> = {
  Active: "bg-green-400",
  Confirmed: "bg-blue-400",
  Archived: "bg-gray-300",
  "Cancelled Doctor": "bg-red-300",
  "Cancelled Hospital": "bg-orange-300",
};

// ── data hook ────────────────────────────────────────────────────────

function useCalendarShifts(month: Date, statusFilter: string, hospitalFilter: string) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  return useQuery({
    queryKey: [
      "calendar-shifts",
      monthStart.toISOString(),
      statusFilter,
      hospitalFilter,
    ],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select("*")
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59).toISOString())
        .order("start_time", { ascending: true })
        .range(0, 1999);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (hospitalFilter && hospitalFilter !== "all") {
        query = query.eq("hospital_name", hospitalFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shift[];
    },
  });
}

function useHospitalList() {
  return useQuery({
    queryKey: ["shift-hospitals-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("hospital_name")
        .range(0, 1999);
      if (error) throw error;
      return [...new Set(data.map((d) => d.hospital_name).filter(Boolean))].sort();
    },
  });
}

// ── Shift detail dialog ──────────────────────────────────────────────

function ShiftDetailDialog({
  shift,
  open,
  onClose,
}: {
  shift: Shift | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!shift) return null;

  const hours =
    shift.start_time && shift.end_time
      ? (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000
      : 0;
  const totalValue = hours * (shift.rate_per_hour || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#1F3A6A]" />
            Shift Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${STATUS_COLORS[shift.status] || "bg-gray-400"}`}
            >
              {shift.status}
            </span>
            {shift.shift_id && (
              <span className="text-xs text-muted-foreground">
                #{shift.shift_id}
              </span>
            )}
          </div>

          {/* Hospital */}
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{shift.hospital_name}</p>
              {shift.hospital_location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {shift.hospital_location.replace(", Australia", "").trim()}
                </p>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm">{formatDate(shift.start_time)}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                {hours > 0 && ` (${hours.toFixed(1)}h)`}
              </p>
            </div>
          </div>

          {/* Rate */}
          <div className="flex items-start gap-3">
            <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm">
                <span className="font-semibold text-green-700">
                  ${shift.rate_per_hour}/hr
                </span>
                {totalValue > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (${Math.round(totalValue).toLocaleString()} total)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Specialty & Skill */}
          {(shift.specialty || shift.skill_level) && (
            <div className="flex flex-wrap gap-2">
              {shift.specialty && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {shift.specialty}
                </span>
              )}
              {shift.skill_level && (
                <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {shift.skill_level}
                </span>
              )}
            </div>
          )}

          {/* Assigned doctor */}
          {shift.assigned_doctor_name && (
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{shift.assigned_doctor_name}</p>
                {shift.assigned_doctor_email && (
                  <p className="text-xs text-muted-foreground">
                    {shift.assigned_doctor_email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Applicants */}
          {shift.applicant_count > 0 && (
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                {shift.applicant_count} applicant{shift.applicant_count !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Contact */}
          {shift.contact_name && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Hospital Contact</p>
              <p className="text-sm">{shift.contact_name}</p>
              {shift.contact_phone && (
                <p className="text-xs text-muted-foreground">{shift.contact_phone}</p>
              )}
              {shift.contact_email && (
                <p className="text-xs text-muted-foreground">{shift.contact_email}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Day cell ─────────────────────────────────────────────────────────

function DayCell({
  date,
  shifts,
  isCurrentMonth,
  onSelectShift,
  onSelectDay,
}: {
  date: Date;
  shifts: Shift[];
  isCurrentMonth: boolean;
  onSelectShift: (s: Shift) => void;
  onSelectDay: (d: Date, shifts: Shift[]) => void;
}) {
  const today = isToday(date);
  const maxVisible = 3;
  const visible = shifts.slice(0, maxVisible);
  const overflow = shifts.length - maxVisible;

  return (
    <div
      className={`min-h-[100px] border-b border-r p-1 transition-colors ${
        isCurrentMonth ? "bg-white" : "bg-gray-50/50"
      } ${today ? "ring-2 ring-inset ring-[#1F3A6A]/20" : ""}`}
    >
      <div className="mb-0.5 flex items-center justify-between px-1">
        <span
          className={`text-xs font-medium ${
            today
              ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#1F3A6A] text-white"
              : isCurrentMonth
                ? "text-foreground"
                : "text-muted-foreground/50"
          }`}
        >
          {date.getDate()}
        </span>
        {shifts.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {shifts.length}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {visible.map((shift) => (
          <button
            key={shift.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectShift(shift);
            }}
            className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white transition-opacity hover:opacity-80 ${STATUS_COLORS[shift.status] || "bg-gray-400"}`}
            title={`${shift.hospital_name} – ${formatTime(shift.start_time)}`}
          >
            {shift.hospital_name}
          </button>
        ))}
        {overflow > 0 && (
          <button
            onClick={() => onSelectDay(date, shifts)}
            className="w-full rounded px-1 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-gray-100"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}

// ── Day detail dialog (when clicking "+N more") ──────────────────────

function DayDetailDialog({
  date,
  shifts,
  open,
  onClose,
  onSelectShift,
}: {
  date: Date | null;
  shifts: Shift[];
  open: boolean;
  onClose: () => void;
  onSelectShift: (s: Shift) => void;
}) {
  if (!date) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {date.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
            {" "}— {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shifts.map((shift) => (
            <button
              key={shift.id}
              onClick={() => {
                onClose();
                onSelectShift(shift);
              }}
              className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50"
            >
              <div
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[shift.status] || "bg-gray-300"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {shift.hospital_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                  {shift.specialty && ` · ${shift.specialty}`}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${STATUS_COLORS[shift.status] || "bg-gray-400"}`}
                  >
                    {shift.status}
                  </span>
                  <span className="text-xs font-semibold text-green-700">
                    ${shift.rate_per_hour}/hr
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main calendar ────────────────────────────────────────────────────

export default function ShiftCalendar() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [statusFilter, setStatusFilter] = useState("all");
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [dayDetail, setDayDetail] = useState<{
    date: Date;
    shifts: Shift[];
  } | null>(null);

  const { data: shifts = [], isLoading } = useCalendarShifts(
    currentMonth,
    statusFilter,
    hospitalFilter
  );
  const { data: hospitals = [] } = useHospitalList();

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    for (const shift of shifts) {
      if (!shift.start_time) continue;
      const d = new Date(shift.start_time);
      const key = dateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(shift);
    }
    return map;
  }, [shifts]);

  // Build calendar grid (6 weeks)
  const calendarDays = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const dayOfWeek = first.getDay(); // 0=Sun
    // Start from Monday: adjust so Mon=0
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(first);
    start.setDate(start.getDate() - mondayOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  // Summary stats
  const stats = useMemo(() => {
    const active = shifts.filter((s) => s.status === "Active").length;
    const confirmed = shifts.filter((s) => s.status === "Confirmed").length;
    const archived = shifts.filter((s) => s.status === "Archived").length;
    const cancelled = shifts.filter(
      (s) => s.status === "Cancelled Doctor" || s.status === "Cancelled Hospital"
    ).length;
    const uniqueHospitals = new Set(shifts.map((s) => s.hospital_name)).size;
    return { total: shifts.length, active, confirmed, archived, cancelled, uniqueHospitals };
  }, [shifts]);

  const goToday = () => setCurrentMonth(startOfMonth(new Date()));

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      {/* Month stats bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
          {stats.total} shifts this month
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {stats.active} active
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {stats.confirmed} confirmed
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          {stats.archived} archived
        </span>
        {stats.cancelled > 0 && (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {stats.cancelled} cancelled
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          · {stats.uniqueHospitals} hospital{stats.uniqueHospitals !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-bold text-[#1F3A6A]">
            {formatMonthYear(currentMonth)}
          </h2>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={goToday}>
            Today
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
              <SelectItem value="Cancelled Doctor">Cancelled Doctor</SelectItem>
              <SelectItem value="Cancelled Hospital">Cancelled Hospital</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
            <SelectTrigger className="w-[200px]">
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
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-[500px] items-center justify-center text-muted-foreground">
              Loading calendar...
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b bg-gray-50">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="border-r px-2 py-2 text-center text-xs font-semibold text-muted-foreground last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>
              {/* Day grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const key = dateKey(day);
                  const dayShifts = shiftsByDate[key] || [];
                  const isCurrentMo = day.getMonth() === currentMonth.getMonth();
                  return (
                    <DayCell
                      key={i}
                      date={day}
                      shifts={dayShifts}
                      isCurrentMonth={isCurrentMo}
                      onSelectShift={setSelectedShift}
                      onSelectDay={(d, s) => setDayDetail({ date: d, shifts: s })}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-green-500" /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-blue-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-gray-400" /> Archived
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-red-400" /> Cancelled (Doctor)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-orange-400" /> Cancelled (Hospital)
        </span>
      </div>

      {/* Dialogs */}
      <ShiftDetailDialog
        shift={selectedShift}
        open={!!selectedShift}
        onClose={() => setSelectedShift(null)}
      />
      <DayDetailDialog
        date={dayDetail?.date ?? null}
        shifts={dayDetail?.shifts ?? []}
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        onSelectShift={(s) => {
          setDayDetail(null);
          setSelectedShift(s);
        }}
      />
    </div>
  );
}
