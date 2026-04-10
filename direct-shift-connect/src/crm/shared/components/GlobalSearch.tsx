import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Stethoscope,
  Building2,
  CalendarClock,
  Search,
  MapPin,
  Clock,
  DollarSign,
  FileCheck,
  Users,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  type: "doctor" | "hospital" | "shift";
  title: string;
  subtitle: string;
  meta?: string;
  url: string;
}

// ── Search hook ──────────────────────────────────────────────────────

function useGlobalSearch(query: string, open: boolean) {
  return useQuery({
    queryKey: ["global-search", query],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];

      const results: SearchResult[] = [];
      const q = `%${query}%`;

      // Search doctors, hospitals, and shifts in parallel
      const [doctorsRes, hospitalsRes, shiftsRes] = await Promise.all([
        supabase
          .from("doctors")
          .select("id, full_name, email, phone, skill_level, status, specialities, has_documents, has_references, ahpra_number")
          .or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q},specialty.ilike.${q},ahpra_number.ilike.${q}`)
          .order("full_name")
          .limit(8),
        supabase
          .from("hospitals")
          .select("id, name, location, status, contact_email")
          .or(`name.ilike.${q},location.ilike.${q},contact_email.ilike.${q}`)
          .order("name")
          .limit(6),
        supabase
          .from("shifts")
          .select("id, hospital_name, hospital_location, specialty, skill_level, status, start_time, rate_per_hour")
          .or(`hospital_name.ilike.${q},specialty.ilike.${q},hospital_location.ilike.${q},shift_id.ilike.${q}`)
          .order("start_time", { ascending: false })
          .limit(6),
      ]);

      // Map doctors
      for (const doc of doctorsRes.data || []) {
        const badges: string[] = [];
        if (doc.skill_level) badges.push(doc.skill_level);
        if (doc.status) badges.push(doc.status);
        results.push({
          id: `doctor-${doc.id}`,
          type: "doctor",
          title: doc.full_name,
          subtitle: doc.email || doc.phone || "No contact",
          meta: badges.join(" · "),
          url: `/crm/doctors/${doc.id}`,
        });
      }

      // Map hospitals
      for (const hosp of hospitalsRes.data || []) {
        results.push({
          id: `hospital-${hosp.id}`,
          type: "hospital",
          title: hosp.name,
          subtitle: hosp.location || hosp.contact_email || "No location",
          meta: hosp.status || undefined,
          url: `/crm/hospitals/${hosp.id}`,
        });
      }

      // Map shifts
      for (const shift of shiftsRes.data || []) {
        const date = shift.start_time
          ? new Date(shift.start_time).toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
            })
          : "No date";
        const parts: string[] = [date];
        if (shift.specialty) parts.push(shift.specialty);
        if (shift.rate_per_hour) parts.push(`$${shift.rate_per_hour}/hr`);
        results.push({
          id: `shift-${shift.id}`,
          type: "shift",
          title: shift.hospital_name,
          subtitle: parts.join(" · "),
          meta: shift.status,
          url: `/crm/shifts`,
        });
      }

      return results;
    },
    enabled: open && query.length >= 2,
    staleTime: 30000,
  });
}

// ── Icon map ─────────────────────────────────────────────────────────

const TYPE_ICONS = {
  doctor: Stethoscope,
  hospital: Building2,
  shift: CalendarClock,
};

const TYPE_LABELS = {
  doctor: "Doctors",
  hospital: "Hospitals",
  shift: "Shifts",
};

const TYPE_COLORS = {
  doctor: "text-blue-600 bg-blue-50",
  hospital: "text-purple-600 bg-purple-50",
  shift: "text-green-600 bg-green-50",
};

// ── Status badge ─────────────────────────────────────────────────────

function MiniStatus({ status }: { status: string | undefined }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    Active: "bg-green-100 text-green-700",
    pipeline: "bg-blue-100 text-blue-700",
    Confirmed: "bg-blue-100 text-blue-700",
    Archived: "bg-gray-100 text-gray-600",
    closed: "bg-green-100 text-green-700",
    lead: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

// ── Trigger button ───────────────────────────────────────────────────

export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search everything...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
        <span className="text-xs">&#8984;</span>K
      </kbd>
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: results = [], isLoading } = useGlobalSearch(query, open);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay so the user doesn't see the flash
      const t = setTimeout(() => setQuery(""), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Group results by type
  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      navigate(result.url);
    },
    [navigate, onOpenChange]
  );

  const typeOrder: Array<"doctor" | "hospital" | "shift"> = [
    "doctor",
    "hospital",
    "shift",
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search doctors, hospitals, shifts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.length < 2 ? (
          <div className="py-8 text-center">
            <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Search across doctors, hospitals, and shifts
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        ) : (
          <>
            <CommandEmpty>
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No results for "{query}"
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Try a different search term
                </p>
              </div>
            </CommandEmpty>

            {typeOrder.map((type, idx) => {
              const items = grouped[type];
              if (!items || items.length === 0) return null;
              const Icon = TYPE_ICONS[type];
              return (
                <div key={type}>
                  {idx > 0 && grouped[typeOrder[idx - 1]]?.length > 0 && (
                    <CommandSeparator />
                  )}
                  <CommandGroup
                    heading={
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {TYPE_LABELS[type]}
                        <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold">
                          {items.length}
                        </span>
                      </span>
                    }
                  >
                    {items.map((result) => {
                      const ItemIcon = TYPE_ICONS[result.type];
                      return (
                        <CommandItem
                          key={result.id}
                          value={`${result.title} ${result.subtitle}`}
                          onSelect={() => handleSelect(result)}
                          className="cursor-pointer"
                        >
                          <div
                            className={`mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TYPE_COLORS[result.type]}`}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {result.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          </div>
                          {result.meta && (
                            <MiniStatus status={result.meta} />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// ── Keyboard shortcut hook ───────────────────────────────────────────

export function useGlobalSearchShortcut() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
