#!/usr/bin/env node
/**
 * Migration script: Insert doctors and hospitals from admin portal exports into Supabase CRM.
 * Usage: node scripts/migrate-data.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import "dotenv/config";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Doctors ──────────────────────────────────────────────────────────
async function migrateDoctors() {
  const raw = JSON.parse(
    readFileSync(resolve(process.env.HOME, "Downloads/doctors_export.json"), "utf-8")
  );

  console.log(`Read ${raw.length} doctors from export file`);

  const rows = raw.map((d) => {
    // registered_date is a unix timestamp (seconds)
    const regDate = d.registered_date
      ? new Date(d.registered_date * 1000).toISOString()
      : null;

    // Determine status based on deleted/disabled flags
    let status = "active";
    if (d.deleted_time) status = "deleted";
    else if (d.disabled_time) status = "unsubscribed";
    else if (!d.register_flag) status = "pipeline";

    return {
      full_name: d.name || "Unknown",
      email: d.email || null,
      phone: d.phone || null,
      status,
      app_downloaded: d.register_flag || false,
      notes: regDate ? `Registered: ${regDate.split("T")[0]}` : null,
    };
  });

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("doctors").insert(batch);
    if (error) {
      console.error(`Error inserting doctors batch ${i}-${i + batch.length}:`, error.message);
      // Try one by one for this batch
      for (const row of batch) {
        const { error: singleErr } = await supabase.from("doctors").insert(row);
        if (singleErr) {
          console.error(`  Failed: ${row.full_name} - ${singleErr.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`  Inserted doctors ${i + 1}-${i + batch.length}`);
    }
  }

  console.log(`✓ Inserted ${inserted}/${rows.length} doctors`);
}

// ── Hospitals ────────────────────────────────────────────────────────
async function migrateHospitals() {
  // Hospital data extracted from the browser (couldn't download the file)
  const hospitals = HOSPITAL_DATA;

  console.log(`Inserting ${hospitals.length} hospitals`);

  const rows = hospitals.map((h) => ({
    name: (h.n || "Unknown").trim(),
    contact_name: h.cn || null,
    contact_email: h.e || null,
    contact_phone: h.p || null,
    location: h.l || null,
    status: h.s === "churned" ? "churned" : "active",
    notes: null,
  }));

  const { data, error } = await supabase.from("hospitals").insert(rows);
  if (error) {
    console.error("Error inserting hospitals:", error.message);
    // Try one by one
    let inserted = 0;
    for (const row of rows) {
      const { error: singleErr } = await supabase.from("hospitals").insert(row);
      if (singleErr) {
        console.error(`  Failed: ${row.name} - ${singleErr.message}`);
      } else {
        inserted++;
      }
    }
    console.log(`✓ Inserted ${inserted}/${rows.length} hospitals`);
  } else {
    console.log(`✓ Inserted ${rows.length} hospitals`);
  }
}

// Hospital data extracted from admin portal API
const HOSPITAL_DATA = [
  {"n":"Kalgoorlie Hospital","cn":"Kalgoorlie Hospital","e":"slave0019@statdoctor.net","p":"0410868282","l":"Kalgoorlie Hospital, Piccadilly Street, Kalgoorlie WA, Australia","s":"active","c":1770013413},
  {"n":"Mundubbera Multipurpose Health Service","cn":"Mundubbera Multipurpose Health Service","e":"slave0018@statdoctor.net","p":"0410868282","l":"Mundubbera Multi-Purpose Health Service, Leichhardt St, Mundubbera QLD, Australia","s":"active","c":1768650032},
  {"n":"Biggenden Multipurpose Health Centre","cn":"Biggenden Multipurpose Health Centre","e":"slave0017@statdoctor.net","p":"0410868282","l":"Biggenden Hospital, Biggenden QLD, Australia","s":"active","c":1768642174},
  {"n":"Monto Hospital","cn":"Monto","e":"slave0016@statdoctor.net","p":"0410868282","l":"Monto Hospital, Flinders Street, Monto QLD, Australia","s":"active","c":1768642086},
  {"n":"Eidsvold Multipurpose Health Service","cn":"Eidsvold Multipurpose Health Service","e":"slave0015@statdoctor.net","p":"0410868282","l":"Eidsvold Hospital, Moreton St, Eidsvold QLD, Australia","s":"active","c":1768641988},
  {"n":"Childers Hospital","cn":"Childers Hospital","e":"slave0014@statdoctor.net","p":"0410868282","l":"Childers Hospital, Churchill Street, Childers QLD, Australia","s":"active","c":1768641855},
  {"n":"Noosa Private Hospital","cn":"Noosa Private Hospital","e":"slave0013@statdoctor.net","p":"0410868282","l":"Noosa Hospital, Lanyana Way, Noosaville QLD, Australia","s":"active","c":1768641698},
  {"n":"Merri-bek Family Doctors","cn":"Merri-bek Family Doctors","e":"slave0012@statdoctor.net","p":"0422839271","l":"Merri-bek Family Doctors, Pascoe Vale Road, Glenroy VIC, Australia","s":"active","c":1768362283},
  {"n":"Test858585","cn":"Test858585","e":"slave0011@statdoctor.net","p":"0410868282","l":"10 William St, Melbourne VIC, Australia","s":"active","c":1768335285},
  {"n":"StatDoctor","cn":"StatDoctor","e":"slave0010@statdoctor.net","p":"0410868282","l":"101 Collins St, Melbourne VIC, Australia","s":"active","c":1768334968},
  {"n":"The Friendly Society Private Hospital - Bundaberg","cn":"The Friendly Society Private Hospital - Bundaberg","e":"slave009@statdoctor.net","p":"0410868282","l":"The Friendly Society Private Hospital, Queen Street, Bundaberg QLD, Australia","s":"active","c":1767792791},
  {"n":"Mater Private Hospital - Brisbane - Emergency Department (PEHA)","cn":"Mater Private Hospital - Brisbane - Emergency Department (PEHA)","e":"slave008@statdoctor.net","p":"0410868282","l":"Mater Hospital Brisbane, Raymond Terrace, South Brisbane QLD, Australia","s":"active","c":1767630741},
  {"n":"Mater Private Hospital - Rockhampton - Emergency Department (PEHA)","cn":"Mater Private Hospital - Rockhampton - Emergency Department (PEHA)","e":"slave007@statdoctor.net","p":"0410868282","l":"Mater Private Hospital Rockhampton, Ward Street, Rockhampton QLD, Australia","s":"active","c":1767630562},
  {"n":"Mater Private Hospital - McKay - Emergency Department (PEHA)","cn":"Mater Private Hospital - McKay - Emergency Department (PEHA)","e":"slave006@statdoctor.net","p":"0410868282","l":"Mater Hospital, Bridge Road, West Mackay QLD, Australia","s":"active","c":1767630330},
  {"n":"Mater Private Hospital - Townsville - Emergency Department (PEHA)","cn":"Mater Private Hospital - Townsville - Emergency Department (PEHA)","e":"slave005@statdoctor.net","p":"0410868282","l":"Mater Private Hospital Townsville, Fulham Road, Pimlico QLD, Australia","s":"active","c":1767630110},
  {"n":"Paraburdoo Medical Centre","cn":"Paraburdoo Medical Centre","e":"slave004@statdoctor.net","p":"0410868282","l":"Paraburdoo Medical Centre, Ashburton Avenue, Paraburdoo WA, Australia","s":"active","c":1766280476},
  {"n":"Gayndah Hospital","cn":"Gayndah Hospital","e":"slave003@statdoctor.net","p":"0410868282","l":"Gayndah Hospital, Simon Street, Gayndah QLD, Australia","s":"active","c":1766278908},
  {"n":"Maryborough Hospital","cn":"Maryborough Hospital","e":"slave002@statdoctor.net","p":"0410868282","l":"Maryborough Hospital, Walker Street, Maryborough QLD, Australia","s":"active","c":1766278626},
  {"n":"Gin Gin Hospital","cn":"Gin Gin Hospital","e":"slave001@statdoctor.net","p":"0410868282","l":"Gin Gin Hospital, Mulgrave Street, Gin Gin QLD, Australia","s":"active","c":1766117098},
  {"n":"Hervey Bay Hospital","cn":"Hervey Bay Hospital","e":"slave0@statdoctor.net","p":"0410868282","l":"Hervey Bay Hospital, Nissen Street, Urraween QLD, Australia","s":"active","c":1766115556},
  {"n":"Bundaberg Hospital","cn":"Bundaberg Hospital","e":"bundaberg@statdoctor.net","p":"0410868282","l":"Bundaberg Hospital, Bourbong Street, Bundaberg West QLD, Australia","s":"active","c":1766115307},
  {"n":"Hollywood Private Hospital","cn":"Jemima","e":"hollywood@statdoctor.net","p":"0406600399","l":"Hollywood Private Hospital, Monash Avenue, Nedlands WA, Australia","s":"active","c":1762727568},
  {"n":"HEAL Specialist Urgent Care - Newcastle","cn":"Paul Baka","e":"pbaka@healurgentcare.com.au","p":"0451333200","l":"HEAL Specialist Urgent Care - Newcastle, Hunter Street, Newcastle NSW, Australia","s":"active","c":1762596439},
  {"n":"Yarrawonga Health","cn":"Kelly","e":"yarrawonga@statdoctor.net","p":"0412345678","l":"Yarrawonga Health, Piper Street, Yarrawonga VIC, Australia","s":"active","c":1754371459},
  {"n":"Alexandra District Health","cn":"Kaye","e":"alexandra@statdoctor.net","p":"0412345678","l":"Alexandra District Health, Cooper Street, Alexandra VIC, Australia","s":"active","c":1754371301},
  {"n":"Bendigo Health","cn":"Gemma","e":"bendigo@statdoctor.net","p":"0412345678","l":"Bendigo Health, Barnard Street, Bendigo VIC, Australia","s":"active","c":1753855443},
  {"n":"Hobart Private","cn":"Phillip Gaudin","e":"hobart@statdoctor.net","p":"0450828219","l":"Hobart Private Hospital, Argyle Street, Hobart TAS, Australia","s":"active","c":1753698743},
  {"n":"Central West Medical Centre","cn":"Dr Vivian Ndukwe","e":"dr.vndukwe@gmail.com","p":"0419989323","l":"67 Ashley St, Braybrook VIC, Australia","s":"active","c":1753693088},
  {"n":"MyFast Medical","cn":"Farhad","e":"farhad@myfastmedical.com","p":"0406456826","l":"634-644 Mitcham Road, Vermont VIC, Australia","s":"active","c":1753402661},
  {"n":"Echuca Regional Health","cn":"Kath Creme","e":"medicalworkforceunit@erh.org.au","p":"0354855039","l":"Echuca Regional Health, Service Street, Echuca VIC, Australia","s":"active","c":1750637103},
  {"n":"Kutjungka Region Clinics","cn":"June Gulati","e":"june.gulati@kamsc.org.au","p":"0808919200","l":null,"s":"active","c":1750289652},
  {"n":"Woodburn Health GP Clinic","cn":"Chloe Morley","e":"chloe@woodburnhealth.com.au","p":"0266822199","l":"Woodburn Health, River Street, Woodburn NSW, Australia","s":"active","c":1748828744},
  {"n":"Holder Family Practice","cn":"Holder Family Practice","e":"holder@statdoctor.net","p":"0410868282","l":"Holder Family Practice, Dixon Drive, Holder ACT, Australia","s":"active","c":1748657785},
  {"n":"Fisher Family Practice","cn":"Fisher Family Practice","e":"fisher@statdoctor.net","p":"0410868282","l":"Fisher Health Centre, Darwinia Terrace, Fisher ACT, Australia","s":"active","c":1748657715},
  {"n":"Bendigo & District Aboriginal Cooperative","cn":"BDAC","e":"bdac@statdoctor.net","p":"0412345678","l":"Bendigo & District Aboriginal Co-operative, Mundy Street, Bendigo VIC, Australia","s":"active","c":1748419729},
  {"n":"Jirra Jirra Medical Clinic","cn":"BDAC","e":"jirajirra@statdoctor.net","p":"0412345678","l":"Jirra Jirra Medical Clinic, Myers Flat VIC, Australia","s":"active","c":1748419621},
  {"n":"Corella Family Practice","cn":"Grace Tan","e":"corella@statdoctor.net","p":"0412345678","l":"Corella Family Practice, 94 Urquhart Street, Castlemaine VIC, Australia","s":"active","c":1748419464},
  {"n":"Maryborough District Health Service","cn":"Sally","e":"maryborough@statdoctor.net","p":"0412345678","l":"Maryborough District Health Service, Clarendon Street, Maryborough VIC, Australia","s":"active","c":1748419310},
  {"n":"Castlemaine Health","cn":"Noel","e":"castlemaine@statdoctor.net","p":"0412345678","l":"Castlemaine Health, Cornish Street, Castlemaine VIC, Australia","s":"active","c":1748419207},
  {"n":"Maldon Hospital","cn":"Colleen Hewett","e":"maldon@statdoctor.net","p":"0412345678","l":"Maldon Hospital, Chapel Street, Maldon VIC, Australia","s":"active","c":1748419110},
  {"n":"BSOL Practice","cn":"BSOL","e":"bsol@statdoctor.net","p":"0412345678","l":"BSOL, Kangaroo Flat VIC, Australia","s":"active","c":1748418996},
  {"n":"Kyneton District Health","cn":"Caroline","e":"kyneton@statdoctor.net","p":"0412345678","l":"Kyneton District Health, Caroline Chisholm Drive, Kyneton VIC, Australia","s":"active","c":1748418876},
  {"n":"Cobaw Community Health","cn":"Amy Baker","e":"cobaw@statdoctor.net","p":"0412345678","l":"Cobaw Community Health, Mollison Street, Kyneton VIC, Australia","s":"active","c":1748418789},
  {"n":"One Hospital","cn":"Anurag Dhar","e":"anurag@statdoctor.net","p":"0410868282","l":"Royal Melbourne Hospital, Grattan Street, Parkville VIC, Australia","s":"active","c":1747706555},
  {"n":"Jirra Jirra","cn":"Anurag Dhar","e":"jirra@statdoctor.net","p":"0410868282","l":"16 Breen Street, Bendigo VIC 3550, Australia","s":"active","c":1747700978},
  {"n":"My First Hospital","cn":"Anurag Dhar","e":"dhar.anurag91@gmail.com","p":"0410868282","l":"170 Grattan St, Carlton VIC, Australia","s":"active","c":1747700652},
  {"n":"Bendigo Hospital","cn":"Anurag Dhar","e":"anurag@statdoctor.net","p":"0450828219","l":"Bendigo Hospital, Lucan Street, Bendigo VIC, Australia","s":"active","c":1746935437},
  {"n":"Peter Mac","cn":"Peter Mac","e":"peter@statdoctor.net","p":"0412345678","l":"Peter MacCallum Cancer Centre, Grattan Street, Melbourne VIC, Australia","s":"active","c":1746927553},
  {"n":"Royal Melbourne Hospital","cn":"Anurag Dhar","e":"anurag@statdoctor.net","p":"0450828219","l":"Royal Melbourne Hospital, Grattan Street, Parkville VIC, Australia","s":"active","c":1746927376}
];

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("Starting data migration to Supabase CRM...\n");

  // Authenticate first (RLS requires authenticated user)
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: process.env.SUPABASE_EMAIL,
    password: process.env.SUPABASE_PASSWORD,
  });
  if (authErr) {
    console.error("Auth failed:", authErr.message);
    process.exit(1);
  }
  console.log("Authenticated successfully\n");

  // First check if we can connect
  const { data: testData, error: testErr } = await supabase
    .from("doctors")
    .select("id")
    .limit(1);

  if (testErr) {
    console.error("Cannot connect to Supabase:", testErr.message);
    console.error("Make sure the migration 002_doctor_fields.sql has been run.");
    process.exit(1);
  }

  // Check if data already exists
  const { data: existingDoctors } = await supabase
    .from("doctors")
    .select("id", { count: "exact", head: true });
  const { count: docCount } = await supabase
    .from("doctors")
    .select("*", { count: "exact", head: true });
  const { count: hospCount } = await supabase
    .from("hospitals")
    .select("*", { count: "exact", head: true });

  console.log(`Existing data: ${docCount || 0} doctors, ${hospCount || 0} hospitals\n`);

  if (docCount > 0 || hospCount > 0) {
    console.log("⚠ Data already exists. Proceeding will add duplicates.");
    console.log("  Delete existing data first if you want a clean import.\n");
  }

  await migrateDoctors();
  console.log();
  await migrateHospitals();

  console.log("\n✓ Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
