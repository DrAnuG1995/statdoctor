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
  NZ: "bg-teal-100 text-teal-800 border-teal-200",
  "-": "bg-gray-100 text-gray-600 border-gray-200",
};

/**
 * Extract an Australian state abbreviation from a hospital row.
 * Priority:
 *   1. Explicit [STATE:XX] tag in notes field (user override)
 *   2. State parsed from location string
 *   3. "-" if neither matches
 */
export function extractState(
  location: string | null | undefined,
  notes?: string | null | undefined
): string {
  // 1. Check for explicit tag in notes
  if (notes) {
    const tagMatch = notes.match(/\[STATE:(NSW|VIC|QLD|WA|SA|TAS|ACT|NT|NZ)\]/);
    if (tagMatch) return tagMatch[1];
  }
  // 2. Parse location string
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
  if (!state || state === "-") {
    return cleaned || null;
  }
  const tag = `[STATE:${state}]`;
  return cleaned ? `${tag} ${cleaned}` : tag;
}
