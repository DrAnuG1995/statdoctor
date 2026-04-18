// Australian state utilities for filtering/stratifying location data
// Used across Hospitals and Prospects pages.

export const AU_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
  "TELE",
] as const;

export type AuState = (typeof AU_STATES)[number];

export const STATE_COLORS: Record<string, string> = {
  NSW: "bg-sky-100 text-sky-800 border-sky-200",
  VIC: "bg-blue-100 text-blue-800 border-blue-200",
  QLD: "bg-amber-100 text-amber-800 border-amber-200",
  WA: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SA: "bg-red-100 text-red-800 border-red-200",
  TAS: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ACT: "bg-purple-100 text-purple-800 border-purple-200",
  NT: "bg-orange-100 text-orange-800 border-orange-200",
  TELE: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  NZ: "bg-teal-100 text-teal-800 border-teal-200",
  "-": "bg-gray-100 text-gray-600 border-gray-200",
};

// Labels for the pills/dropdowns (TELE is a category, not a state)
export const STATE_LABELS: Record<string, string> = {
  NSW: "NSW",
  VIC: "VIC",
  QLD: "QLD",
  WA: "WA",
  SA: "SA",
  TAS: "TAS",
  ACT: "ACT",
  NT: "NT",
  TELE: "Telehealth",
  NZ: "NZ",
  "-": "Unknown",
};

/**
 * Extract an Australian state abbreviation from a hospital row.
 * Priority:
 *   1. Explicit [STATE:XX] tag in notes field (user override)
 *   2. Telehealth keywords in name/type/location → TELE
 *   3. State parsed from location string
 *   4. "-" if nothing matches
 *
 * Optional 3rd/4th args (name, type) let telehealth detection fire even
 * when the location string is a real place (e.g. WAVED has location
 * "Perth, WA" but is a virtual ED).
 */
export function extractState(
  location: string | null | undefined,
  notes?: string | null | undefined,
  name?: string | null | undefined,
  type?: string | null | undefined
): string {
  // 1. Explicit override tag in notes
  if (notes) {
    const tagMatch = notes.match(
      /\[STATE:(NSW|VIC|QLD|WA|SA|TAS|ACT|NT|NZ|TELE)\]/
    );
    if (tagMatch) return tagMatch[1];
  }
  // 2. Telehealth auto-detection — check name, type, location
  const telehealthHay = [location, type, name].filter(Boolean).join(" ");
  if (
    /\b(telehealth|virtual ED|virtual emergency|telemedicine|televideo)\b/i.test(
      telehealthHay
    )
  ) {
    return "TELE";
  }
  // 3. Parse location
  if (!location) return "-";
  if (/\bNZ\b|New Zealand/i.test(location)) return "NZ";
  const match = location.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
  return match ? match[1] : "-";
}

/**
 * Set the state override in a notes string. Replaces any existing
 * [STATE:XX] tag. Pass state = null to clear the override.
 */
export function setStateInNotes(
  existingNotes: string | null | undefined,
  state: string | null
): string | null {
  let cleaned = (existingNotes || "")
    .replace(/\[STATE:[A-Z]+\]\s*/g, "")
    .trim();
  // Accept TELE, NZ, or any AU state

  if (!state || state === "-") {
    return cleaned || null;
  }
  const tag = `[STATE:${state}]`;
  return cleaned ? `${tag} ${cleaned}` : tag;
}
