import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Parse the admin portal CSV export (pipe-delimited)
function parseCSV(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.trim().split("\n");
  const header = lines[0].split("|"); // name|email|phone|registered|status

  return lines.slice(1).map((line) => {
    const [name, email, phone, registered, status] = line.split("|");
    return {
      full_name: name?.trim() || "",
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      registered_date: parseDate(registered?.trim()),
      status: mapStatus(status?.trim()),
      source: "admin_portal",
    };
  }).filter(d => d.full_name);
}

// Parse dates like "05 Apr 2026", "30 July 2025", etc.
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Map admin portal status to CRM status
function mapStatus(portalStatus) {
  if (!portalStatus) return "active";
  const lower = portalStatus.toLowerCase();
  if (lower === "active") return "active";
  if (lower === "inactive" || lower === "deactivated") return "unsubscribed";
  if (lower === "deleted") return "deleted";
  return "active";
}

async function syncDoctors(csvPath) {
  console.log(`\n📋 Reading CSV from: ${csvPath}`);
  const doctors = parseCSV(csvPath);
  console.log(`Found ${doctors.length} doctors in CSV`);

  // Get existing doctors from Supabase
  const { data: existing, error: fetchErr } = await supabase
    .from("doctors")
    .select("id, email, full_name, source");

  if (fetchErr) {
    console.error("Error fetching existing doctors:", fetchErr);
    process.exit(1);
  }
  console.log(`Found ${existing.length} existing doctors in CRM`);

  // Build lookup maps
  const emailMap = new Map();
  const nameMap = new Map();
  existing.forEach(d => {
    if (d.email) emailMap.set(d.email.toLowerCase(), d);
    nameMap.set(d.full_name.toLowerCase(), d);
  });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of doctors) {
    // Match by email first, then by name
    const existingByEmail = doc.email ? emailMap.get(doc.email.toLowerCase()) : null;
    const existingByName = nameMap.get(doc.full_name.toLowerCase());
    const match = existingByEmail || existingByName;

    if (match) {
      // Update existing record with any new info
      const updates = {};
      if (doc.phone && !match.phone) updates.phone = doc.phone;
      if (doc.registered_date) updates.registered_date = doc.registered_date;
      if (doc.source && match.source !== "admin_portal") updates.source = doc.source;
      updates.updated_at = new Date().toISOString();

      if (Object.keys(updates).length > 1) { // more than just updated_at
        const { error } = await supabase
          .from("doctors")
          .update(updates)
          .eq("id", match.id);
        if (error) {
          console.error(`Error updating ${doc.full_name}:`, error.message);
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    } else {
      // Insert new doctor
      const { error } = await supabase.from("doctors").insert({
        full_name: doc.full_name,
        email: doc.email,
        phone: doc.phone,
        status: doc.status,
        source: doc.source,
        registered_date: doc.registered_date,
        app_downloaded: true, // They're on the admin portal, so they have the app
        specialities: [],
        ahpra_restrictions: false,
        has_references: false,
        has_documents: false,
      });
      if (error) {
        console.error(`Error inserting ${doc.full_name}:`, error.message);
      } else {
        inserted++;
      }
    }
  }

  console.log(`\n✅ Sync complete:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated:  ${updated}`);
  console.log(`   Skipped:  ${skipped} (already up to date)`);
  console.log(`   Total:    ${doctors.length}`);
}

// Run with CSV path argument or default
const csvPath = process.argv[2] || `${process.env.HOME}/Downloads/doctors_export.csv`;
syncDoctors(csvPath);
