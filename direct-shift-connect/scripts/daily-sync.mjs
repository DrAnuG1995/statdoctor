#!/usr/bin/env node

/**
 * StatDoctor Daily Sync — runs at 0800 AEST via GitHub Actions.
 *
 * Pulls everything from admin.statdoctor.app and updates Supabase:
 *   - Doctors: profile, skill level, specialities, docs, refs, verification tags
 *   - Shifts:  all shifts with status, rates, hospitals, times
 *
 * Environment:
 *   SUPABASE_SERVICE_KEY  — service role key (bypasses RLS)
 *   ADMIN_PORTAL_TOKEN    — admin.statdoctor.app token from localStorage
 *   SUPABASE_URL          — optional, defaults to prod
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://hyqdbufdqjvirrytykvr.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_PORTAL_TOKEN;
const ADMIN_BASE = "https://api.statdoctor.app/web/v1/admin";

if (!SUPABASE_KEY || !ADMIN_TOKEN) {
  console.error("❌ Missing SUPABASE_SERVICE_KEY or ADMIN_PORTAL_TOKEN");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const SKILL_MAP = {
  "sk-1": "Pgy2+", "sk-2": "Pgy3+", "sk-3": "Pgy4+",
  "sk-4": "Registrar", "sk-5": "VMO/SMO", "sk-6": "Consultant",
};
const SPEC_MAP = {
  "sp-1": "Addiction Medicine", "sp-2": "Anaesthetics", "sp-3": "Cardiology",
  "sp-4": "Clinical Pharmacology", "sp-5": "Dermatology",
  "sp-6": "Emergency Medicine", "sp-7": "Endocrinology",
  "sp-8": "Gastroenterology and Hepatology", "sp-9": "General Medicine/Physician",
  "sp-10": "General Practice", "sp-11": "Geriatric Medicine",
  "sp-12": "Haematology", "sp-13": "Immunology and Allergy",
  "sp-14": "Infectious Disease", "sp-15": "Intensive Care Medicine",
  "sp-16": "Medical Oncology", "sp-17": "Nephrology", "sp-18": "Neurology",
  "sp-19": "Ophthalmology", "sp-20": "Obstetrics and Gynaecology",
  "sp-21": "Occupational and Environmental medicine",
  "sp-22": "Nuclear Medicine",
  "sp-23": "Paediatrics and child health", "sp-24": "Pain medicine",
  "sp-25": "Palliative Medicine", "sp-26": "Pathology",
  "sp-27": "Psychiatry", "sp-28": "Public Health Medicine",
  "sp-29": "Radiation Oncology", "sp-30": "Radiology",
  "sp-31": "Rehabilitation medicine", "sp-32": "Respiratory",
  "sp-33": "Rheumatology", "sp-34": "Rural medicine",
  "sp-35": "Sexual Health medicine", "sp-36": "Sports and exercise medicine",
  "sp-37": "Surgery – General", "sp-38": "Surgery – Cardiothoracic",
  "sp-39": "Surgery – Neurosurgery", "sp-40": "Surgery – Oral and Maxillofacial",
  "sp-41": "Surgery – Orthopaedic", "sp-42": "Surgery – Otolaryngology",
  "sp-43": "Surgery – Paediatric", "sp-44": "Surgery – Plastics",
  "sp-45": "Surgery – Urology", "sp-46": "Surgery – Vascular",
  "su340380": "Surgical Assistant", "te514116": "Telehealth",
};
const DOC_FIELDS = [
  "primaryDocument", "otherDocument", "threeDocument",
  "policeCheck", "workVisa", "criminalHistoryCheck",
  "workingWithChildrenCheck", "vaccinationCertificate",
  "medicareCard", "approvalForSecondaryEmployment",
  "referral", "medicalDegree",
];

async function adminFetch(path, opts = {}) {
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    ...opts,
    headers: {
      "doctor-admin-token": ADMIN_TOKEN,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.code === 90004) {
    throw new Error(
      "❌ ADMIN_PORTAL_TOKEN expired. Log into admin.statdoctor.app, " +
      "grab the fresh 'token' from localStorage, and update the GitHub secret."
    );
  }
  return data;
}

function unixToISO(ts) {
  if (!ts || ts === 0) return null;
  return new Date(ts * 1000).toISOString();
}

// ─── DOCTORS ────────────────────────────────────────────────────────────────

async function syncDoctors() {
  console.log("\n👥 Syncing doctors...");
  const list = (await adminFetch(
    "/user/users-list/all/1/1000/DESC/createTime",
    { method: "POST", body: "{}" }
  )).data?.list || [];

  const seen = new Set();
  const unique = list.filter((d) => {
    const e = d.userInfoVO?.email?.toLowerCase();
    if (!e || seen.has(e)) return false;
    seen.add(e);
    return true;
  });

  const { data: crmDocs } = await sb
    .from("doctors")
    .select("email, id, notes");
  const crmByEmail = new Map();
  crmDocs?.forEach((d) => {
    if (d.email) crmByEmail.set(d.email.toLowerCase(), d);
  });

  let created = 0,
    updated = 0,
    errors = 0;

  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    await Promise.all(
      batch.map(async (doc) => {
        const info = doc.userInfoVO || {};
        const email = info.email;
        if (!email) return;

        try {
          const detail = (await adminFetch(
            `/user/users-info-get/${doc.userId}`,
            { method: "GET" }
          )).data || {};
          const med = detail.medicalVO || {};

          // Handle new + legacy field names
          const skillLevel = med.skillLevel || SKILL_MAP[med.seniority] || med.seniority || null;
          const specsRaw = med.specialties || med.specialty || "";
          const specsList = specsRaw.split(",").map((s) => s.trim()).filter(Boolean);
          const specs = specsList[0]?.startsWith("sp-") || specsList[0]?.match(/^(su|te)\d+$/)
            ? specsList.map((s) => SPEC_MAP[s] || s)
            : specsList;

          const docVO = detail.docVO || {};
          let uploaded = 0, unverified = 0;
          for (const field of DOC_FIELDS) {
            const val = docVO[field];
            if (val && val !== "") {
              uploaded++;
              if (val.split(";")[1] !== "1") unverified++;
            }
          }

          const refs = detail.referencesVOList || [];
          const refsCount = refs.length;
          const refsPending = refs.filter(
            (r) => !r.verifiedTime || r.verifiedTime === 0
          ).length;

          const tags = [];
          if (unverified > 0) tags.push(`[UNVERIFIED_DOCS:${unverified}]`);
          if (refsPending > 0) tags.push(`[UNVERIFIED_REFS:${refsPending}]`);

          const existing = crmByEmail.get(email.toLowerCase());

          const payload = {
            full_name:
              `Dr. ${info.firstName || ""} ${info.surname || info.lastName || ""}`.trim() || undefined,
            phone: info.mobileNumber || info.mobile || undefined,
            skill_level: skillLevel || undefined,
            medical_degree: med.medicalDegree || undefined,
            specialities: specs.length > 0 ? specs : undefined,
            ahpra_number: med.ahpraNumber || undefined,
            ahpra_restrictions: med.ahpraLicenseFlag === false,
            has_references: refsCount > 0,
            has_documents: uploaded > 0,
            source: "admin_portal",
            updated_at: new Date().toISOString(),
          };

          if (tags.length > 0) {
            let notes = (existing?.notes || "")
              .replace(/\[UNVERIFIED_DOCS:\d+\]/g, "")
              .replace(/\[UNVERIFIED_REFS:\d+\]/g, "")
              .trim();
            payload.notes = (notes ? notes + " " : "") + tags.join(" ");
          } else if (existing?.notes) {
            const cleaned = existing.notes
              .replace(/\[UNVERIFIED_DOCS:\d+\]/g, "")
              .replace(/\[UNVERIFIED_REFS:\d+\]/g, "")
              .trim();
            if (cleaned !== existing.notes) payload.notes = cleaned || null;
          }

          Object.keys(payload).forEach(
            (k) => payload[k] === undefined && delete payload[k]
          );

          if (existing) {
            const { error } = await sb
              .from("doctors")
              .update(payload)
              .eq("email", email);
            if (error) throw error;
            updated++;
          } else {
            payload.email = email;
            payload.status = "active";
            payload.created_at = new Date().toISOString();
            const { error } = await sb.from("doctors").insert(payload);
            if (error) throw error;
            created++;
            console.log(`  + NEW: ${email}`);
          }
        } catch (err) {
          errors++;
          console.error(`  ! ${email}: ${err.message}`);
        }
      })
    );
  }

  console.log(
    `✅ Doctors: ${unique.length} processed · ${created} new · ${updated} updated · ${errors} errors`
  );
  return { total: unique.length, created, updated, errors };
}

// ─── SHIFTS ─────────────────────────────────────────────────────────────────

function shiftStatus(s) {
  if (s.deletedTime > 0) return "Archived";
  if (s.accountCancelTime > 0) return "Cancelled Hospital";
  if (s.userCancelTime > 0) return "Cancelled Doctor";
  if (s.completedTime > 0 || s.confirmedTime > 0) return "Confirmed";
  if (s.archivedTime > 0) return "Archived";
  return s.status || "Active";
}

async function syncShifts() {
  console.log("\n📅 Syncing shifts...");
  let all = [];
  for (let page = 1; page <= 10; page++) {
    const res = await adminFetch(
      `/shifts/shifts-list/all/all/${page}/500/DESC/createTime`,
      { method: "POST", body: "{}" }
    );
    const list = res.data?.list || [];
    if (list.length === 0) break;
    all = all.concat(list);
    if (list.length < 500) break;
  }
  console.log(`  Fetched ${all.length} shifts from admin`);

  // Build map of existing shifts
  let crmShifts = [];
  for (let p = 0; p < 10; p++) {
    const { data } = await sb
      .from("shifts")
      .select("id, shift_day_id")
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    crmShifts = crmShifts.concat(data);
    if (data.length < 1000) break;
  }
  const crmByDayId = new Map();
  crmShifts.forEach((s) => {
    if (s.shift_day_id) crmByDayId.set(s.shift_day_id, s.id);
  });

  const inserts = [];
  const updates = [];
  for (const s of all) {
    const payload = {
      shift_id: s.shiftsId,
      shift_no: s.shiftsNo,
      shift_day_id: s.shiftsDaysId,
      hospital_name: s.hospitalName || "",
      hospital_email: s.hospitalEmail || null,
      hospital_location: s.hospitalLocation || null,
      specialty: SPEC_MAP[s.specialty] || s.specialty || null,
      skill_level: SKILL_MAP[s.skillLevel] || s.skillLevel || null,
      support_level: s.supportLevel || null,
      rate_per_hour: s.ratePerHour || 0,
      fixed_rate: s.fixedRate || 0,
      status: shiftStatus(s),
      shift_date: s.shiftsDays || null,
      start_time: unixToISO(s.startTime),
      end_time: unixToISO(s.endTime),
      created_at: unixToISO(s.createTime) || new Date().toISOString(),
      confirmed_at: unixToISO(s.confirmedTime),
      completed_at: unixToISO(s.completedTime),
      accommodation: s.accommodation || null,
      travel_included: s.travelFlag === 1,
      contact_name: s.contactFullName || s.adminName || null,
      contact_phone: s.contactNumber || null,
      contact_email: s.contactEmail || null,
      applicant_count: s.applicantCount || 0,
      updated_at: new Date().toISOString(),
    };
    if (crmByDayId.has(s.shiftsDaysId)) {
      updates.push({ id: crmByDayId.get(s.shiftsDaysId), payload });
    } else {
      inserts.push(payload);
    }
  }

  let inserted = 0, updated = 0, errors = 0;

  for (let i = 0; i < inserts.length; i += 50) {
    const batch = inserts.slice(i, i + 50);
    const { error } = await sb.from("shifts").insert(batch);
    if (error) {
      errors += batch.length;
      console.error(`  Insert batch error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  for (let i = 0; i < updates.length; i += 20) {
    const batch = updates.slice(i, i + 20);
    await Promise.all(
      batch.map(async ({ id, payload }) => {
        const { error } = await sb.from("shifts").update(payload).eq("id", id);
        if (error) errors++;
        else updated++;
      })
    );
  }

  console.log(
    `✅ Shifts: ${all.length} processed · ${inserted} new · ${updated} updated · ${errors} errors`
  );
  return { total: all.length, inserted, updated, errors };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

(async () => {
  const start = Date.now();
  console.log(`\n🚀 StatDoctor Daily Sync — ${new Date().toISOString()}`);

  try {
    const docResult = await syncDoctors();
    const shiftResult = await syncShifts();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n🎉 Done in ${elapsed}s`);
    console.log(`   Doctors: ${docResult.created} new · ${docResult.updated} updated`);
    console.log(`   Shifts:  ${shiftResult.inserted} new · ${shiftResult.updated} updated`);

    if (docResult.errors > 0 || shiftResult.errors > 0) {
      console.error(`⚠️  Some errors occurred — check logs above`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Sync failed: ${err.message}`);
    process.exit(1);
  }
})();
