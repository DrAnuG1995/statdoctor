#!/usr/bin/env node

/**
 * StatDoctor CRM Doctor Sync Agent
 *
 * Uses the Claude Agent SDK to automatically sync doctor data from
 * admin.statdoctor.app into the Supabase CRM.
 *
 * What it syncs:
 * - New doctor registrations
 * - Skill level, medical degree, specialities
 * - References status (count + verified/pending)
 * - Documents status (uploaded + verified/unverified)
 * - Tags doctors with [UNVERIFIED_DOCS:X] and [UNVERIFIED_REFS:X] in notes
 *
 * Usage:
 *   # One-time run
 *   node scripts/agent-sync-doctors.mjs
 *
 *   # With schedule (runs daily at 6am AEST)
 *   node scripts/agent-sync-doctors.mjs --schedule
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY     - Claude API key
 *   SUPABASE_SERVICE_KEY  - Supabase service role key (bypasses RLS)
 *   ADMIN_PORTAL_TOKEN    - admin.statdoctor.app auth token
 *
 * Optional:
 *   SUPABASE_URL          - Supabase project URL (defaults to StatDoctor project)
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ─── Configuration ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://hyqdbufdqjvirrytykvr.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_EMAIL = process.env.SUPABASE_EMAIL;
const SUPABASE_PASSWORD = process.env.SUPABASE_PASSWORD;
const ADMIN_TOKEN = process.env.ADMIN_PORTAL_TOKEN;
const ADMIN_API_BASE = "https://api.statdoctor.app/web/v1/admin";

if (!SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY is required.");
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.error("ERROR: ADMIN_PORTAL_TOKEN is required. Set it in .env or environment.");
  console.error("Get it from: admin.statdoctor.app > browser localStorage > key 'token'");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// If using anon key (not service role), we need to authenticate
const isServiceRole = SUPABASE_KEY.length > 100; // Service role keys are JWTs (~170+ chars)
if (!isServiceRole) {
  if (!SUPABASE_EMAIL || !SUPABASE_PASSWORD) {
    console.error("ERROR: Using anon key — SUPABASE_EMAIL and SUPABASE_PASSWORD are required to authenticate.");
    console.error("Set your CRM login credentials in .env");
    process.exit(1);
  }
  console.log("  Authenticating with Supabase (anon key + login)...");
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: SUPABASE_EMAIL,
    password: SUPABASE_PASSWORD,
  });
  if (authError) {
    console.error(`ERROR: Supabase auth failed: ${authError.message}`);
    process.exit(1);
  }
  console.log("  Authenticated successfully.");
}

// ─── Code-to-Name Mappings ──────────────────────────────────────────────────

const SKILL_MAP = {
  "sk-1": "Pgy2+", "sk-2": "Pgy3+", "sk-3": "Pgy4+",
  "sk-4": "Registrar", "sk-5": "VMO/SMO", "sk-6": "Consultant",
};

const DEGREE_MAP = {
  "me-1111": "Bachelor of Medicine, Bachelor of Surgery",
  "me-222": "Doctor of medicine (MD)",
  "Doctor of medicane (MD)": "Doctor of medicine (MD)",
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

// ─── Helper Functions ────────────────────────────────────────────────────────

function decodeSkillLevel(raw) {
  if (!raw) return null;
  return SKILL_MAP[raw] || raw;
}

function decodeMedicalDegree(raw) {
  if (!raw) return null;
  return DEGREE_MAP[raw] || raw;
}

function decodeSpecialities(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(s => SPEC_MAP[s] || s).filter(Boolean);
}

// Document fields we check (excluding *Ext, createTime, updatedTime)
const DOC_FIELDS = [
  "primaryDocument", "otherDocument", "threeDocument",
  "policeCheck", "workVisa", "criminalHistoryCheck",
  "workingWithChildrenCheck", "vaccinationCertificate",
  "medicareCard", "approvalForSecondaryEmployment",
  "referral", "medicalDegree",
];

function parseDocVerification(docVO) {
  let uploaded = 0, verified = 0, unverified = 0;
  const unverifiedList = [];

  if (!docVO || typeof docVO !== "object") return { uploaded, verified, unverified, unverifiedList };

  for (const field of DOC_FIELDS) {
    const val = docVO[field];
    if (val && val !== "") {
      uploaded++;
      const parts = val.split(";");
      if (parts[1] === "1") {
        verified++;
      } else {
        unverified++;
        unverifiedList.push(field);
      }
    }
  }

  return { uploaded, verified, unverified, unverifiedList };
}

function parseRefsVerification(refsVOList) {
  if (!Array.isArray(refsVOList)) return { count: 0, verified: 0, pending: 0 };

  const count = refsVOList.length;
  const verified = refsVOList.filter(r => r.verifiedTime && r.verifiedTime !== 0).length;
  const pending = count - verified;

  return { count, verified, pending };
}

// ─── Admin Portal API Client ─────────────────────────────────────────────────

async function fetchAllDoctorsFromAdmin() {
  console.log("  Fetching doctor list from admin portal...");

  const res = await fetch(`${ADMIN_API_BASE}/user/users-list/all/1/500/DESC/createTime`, {
    method: "POST",
    headers: {
      "doctor-admin-token": ADMIN_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(`Admin API list failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(`Admin API returned code ${data.code}: ${data.message || "unknown error"}`);
  }

  const list = data.data?.list || [];
  console.log(`  Found ${list.length} doctors on admin portal`);
  return list;
}

async function fetchDoctorDetail(userId) {
  const res = await fetch(`${ADMIN_API_BASE}/user/users-info-get/${userId}`, {
    method: "GET",
    headers: { "doctor-admin-token": ADMIN_TOKEN },
  });

  if (!res.ok) {
    throw new Error(`Admin API detail failed for ${userId}: ${res.status}`);
  }

  const data = await res.json();
  return data.data;
}

// ─── Core Sync Logic ─────────────────────────────────────────────────────────

async function syncDoctors() {
  const startTime = Date.now();
  console.log("\n====================================");
  console.log("  StatDoctor CRM Sync Agent");
  console.log(`  ${new Date().toISOString()}`);
  console.log("====================================\n");

  // Step 1: Fetch all doctors from admin portal
  const adminDoctors = await fetchAllDoctorsFromAdmin();

  // Step 2: Fetch all existing CRM doctors
  console.log("  Fetching existing CRM doctors...");
  const { data: crmDoctors, error: crmError } = await supabase
    .from("doctors")
    .select("email, id, full_name, notes");

  if (crmError) throw new Error(`Supabase read failed: ${crmError.message}`);

  const crmByEmail = new Map();
  crmDoctors.forEach(d => {
    if (d.email) crmByEmail.set(d.email.toLowerCase(), d);
  });
  console.log(`  Found ${crmDoctors.length} doctors in CRM`);

  // Step 3: Process each doctor from admin portal
  let newDoctors = 0;
  let updatedDoctors = 0;
  let errors = 0;
  let processedDetails = 0;

  // Deduplicate by email (keep first occurrence = most recent)
  const seenEmails = new Set();
  const uniqueDoctors = adminDoctors.filter(d => {
    const email = d.userInfoVO?.email?.toLowerCase();
    if (!email || seenEmails.has(email)) return false;
    seenEmails.add(email);
    return true;
  });

  console.log(`  Processing ${uniqueDoctors.length} unique doctors...\n`);

  // Process in batches of 10
  for (let i = 0; i < uniqueDoctors.length; i += 10) {
    const batch = uniqueDoctors.slice(i, i + 10);

    const results = await Promise.all(batch.map(async (adminDoc) => {
      const info = adminDoc.userInfoVO || {};
      const email = info.email;
      if (!email) return null;

      try {
        // Fetch detailed info for refs & docs
        const detail = await fetchDoctorDetail(adminDoc.userId);
        processedDetails++;

        // Decode medical info
        // NEW API format: skillLevel/specialties are already decoded strings.
        // Fall back to legacy codes (seniority/specialty) for older records.
        const medicalVO = detail.medicalVO || {};
        const skillLevel = medicalVO.skillLevel
          || decodeSkillLevel(medicalVO.seniority);
        const medicalDegree = decodeMedicalDegree(medicalVO.medicalDegree);
        const specsRaw = medicalVO.specialties || medicalVO.specialty || "";
        const specsList = specsRaw.split(",").map(s => s.trim()).filter(Boolean);
        // If they look like legacy codes ("sp-6"), decode them
        const specialities = specsList[0]?.startsWith("sp-") || specsList[0]?.match(/^(su|te)\d+$/)
          ? decodeSpecialities(specsList)
          : specsList;
        const ahpraNumber = medicalVO.ahpraNumber || null;
        const ahpraLicenseFlag = medicalVO.ahpraLicenseFlag;

        // Parse refs and docs verification
        const refs = parseRefsVerification(detail.referencesVOList);
        const docs = parseDocVerification(detail.docVO);

        // Build notes tags
        const tags = [];
        if (docs.unverified > 0) tags.push(`[UNVERIFIED_DOCS:${docs.unverified}]`);
        if (refs.pending > 0) tags.push(`[UNVERIFIED_REFS:${refs.pending}]`);

        const existing = crmByEmail.get(email.toLowerCase());

        // Build update payload
        const payload = {
          full_name: `Dr. ${info.firstName || ""} ${info.surname || info.lastName || ""}`.trim() || undefined,
          phone: info.mobileNumber || info.mobile || undefined,
          skill_level: skillLevel || undefined,
          medical_degree: medicalDegree || undefined,
          specialities: specialities.length > 0 ? specialities : undefined,
          ahpra_number: ahpraNumber || undefined,
          ahpra_restrictions: ahpraLicenseFlag === false,
          has_references: refs.count > 0,
          has_documents: docs.uploaded > 0,
          source: "admin_portal",
          updated_at: new Date().toISOString(),
        };

        // Handle notes (preserve existing, update tags)
        if (tags.length > 0) {
          let currentNotes = existing?.notes || "";
          // Remove old tags
          currentNotes = currentNotes
            .replace(/\[UNVERIFIED_DOCS:\d+\]/g, "")
            .replace(/\[UNVERIFIED_REFS:\d+\]/g, "")
            .trim();
          payload.notes = (currentNotes ? currentNotes + " " : "") + tags.join(" ");
        } else if (existing?.notes) {
          // Clear old tags if no longer applicable
          const cleaned = existing.notes
            .replace(/\[UNVERIFIED_DOCS:\d+\]/g, "")
            .replace(/\[UNVERIFIED_REFS:\d+\]/g, "")
            .trim();
          if (cleaned !== existing.notes) {
            payload.notes = cleaned || null;
          }
        }

        // Remove undefined fields
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

        if (existing) {
          // Update existing doctor
          const { error } = await supabase
            .from("doctors")
            .update(payload)
            .eq("email", email);

          if (error) throw error;
          updatedDoctors++;
        } else {
          // Insert new doctor
          payload.email = email;
          payload.status = "active";
          payload.created_at = new Date().toISOString();

          const { error } = await supabase
            .from("doctors")
            .insert(payload);

          if (error) throw error;
          newDoctors++;
          console.log(`    + NEW: ${email}`);
        }

        return { email, success: true };
      } catch (err) {
        errors++;
        console.error(`    ! ERROR: ${email} - ${err.message}`);
        return { email, success: false, error: err.message };
      }
    }));

    // Progress indicator
    const done = Math.min(i + 10, uniqueDoctors.length);
    process.stdout.write(`  Progress: ${done}/${uniqueDoctors.length} doctors processed\r`);
  }

  // Step 4: Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n\n====================================");
  console.log("  Sync Complete!");
  console.log("====================================");
  console.log(`  Total processed:  ${uniqueDoctors.length}`);
  console.log(`  New doctors:      ${newDoctors}`);
  console.log(`  Updated doctors:  ${updatedDoctors}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  Details fetched:  ${processedDetails}`);
  console.log(`  Time elapsed:     ${elapsed}s`);
  console.log("====================================\n");

  return { total: uniqueDoctors.length, newDoctors, updatedDoctors, errors, elapsed };
}

// ─── Claude Agent SDK Tools ──────────────────────────────────────────────────

const syncDoctorsTool = tool(
  "sync_doctors",
  "Sync all doctors from the StatDoctor admin portal to the Supabase CRM. Fetches doctor list, decodes medical info, checks references & documents verification status, and updates/inserts records.",
  {},
  async () => {
    try {
      const result = await syncDoctors();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Sync failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);

const getCrmStatsTool = tool(
  "get_crm_stats",
  "Get current CRM doctor statistics: total count, how many have skill levels, degrees, specialities, references, and documents.",
  {},
  async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("email, skill_level, medical_degree, specialities, has_references, has_documents, notes");

      if (error) throw error;

      const stats = {
        total: data.length,
        hasSkillLevel: data.filter(d => d.skill_level).length,
        hasMedicalDegree: data.filter(d => d.medical_degree).length,
        hasSpecialities: data.filter(d => d.specialities?.length > 0).length,
        hasReferences: data.filter(d => d.has_references).length,
        hasDocuments: data.filter(d => d.has_documents).length,
        withUnverifiedDocs: data.filter(d => d.notes?.includes("UNVERIFIED_DOCS")).length,
        withUnverifiedRefs: data.filter(d => d.notes?.includes("UNVERIFIED_REFS")).length,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(stats, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Stats failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);

const getUnverifiedDoctorsTool = tool(
  "get_unverified_doctors",
  "Get a list of doctors who have unverified documents or references that need admin attention.",
  {
    type: z.enum(["docs", "refs", "both"]).default("both").describe("Filter by unverified docs, refs, or both"),
  },
  async ({ type }) => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("email, full_name, notes, has_references, has_documents");

      if (error) throw error;

      let filtered = data;
      if (type === "docs") {
        filtered = data.filter(d => d.notes?.includes("UNVERIFIED_DOCS"));
      } else if (type === "refs") {
        filtered = data.filter(d => d.notes?.includes("UNVERIFIED_REFS"));
      } else {
        filtered = data.filter(d =>
          d.notes?.includes("UNVERIFIED_DOCS") || d.notes?.includes("UNVERIFIED_REFS")
        );
      }

      const result = filtered.map(d => ({
        email: d.email,
        name: d.full_name,
        unverifiedDocs: d.notes?.match(/\[UNVERIFIED_DOCS:(\d+)\]/)?.[1] || "0",
        unverifiedRefs: d.notes?.match(/\[UNVERIFIED_REFS:(\d+)\]/)?.[1] || "0",
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ count: result.length, doctors: result }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Query failed: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── MCP Server ──────────────────────────────────────────────────────────────

const statdoctorServer = createSdkMcpServer({
  name: "statdoctor",
  version: "1.0.0",
  tools: [syncDoctorsTool, getCrmStatsTool, getUnverifiedDoctorsTool],
});

// ─── Agent Runner ────────────────────────────────────────────────────────────

async function runAgent(customPrompt) {
  const prompt = customPrompt || `
You are the StatDoctor CRM sync agent. Your job is to keep the CRM database up to date.

Please perform the following steps:
1. First, get the current CRM stats to see the baseline
2. Run the doctor sync to pull latest data from the admin portal
3. Get the updated CRM stats to verify the sync worked
4. Get the list of doctors with unverified documents or references
5. Provide a concise summary of what changed and what needs attention

Be efficient and report results clearly.
`.trim();

  console.log("Starting Claude Agent...\n");

  let result = null;

  for await (const message of query({
    prompt,
    options: {
      mcpServers: { statdoctor: statdoctorServer },
      allowedTools: [
        "mcp__statdoctor__sync_doctors",
        "mcp__statdoctor__get_crm_stats",
        "mcp__statdoctor__get_unverified_doctors",
      ],
      permissionMode: "bypassPermissions",
      maxTurns: 15,
      maxBudgetUsd: 1.00,
      model: "claude-sonnet-4-20250514",
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          console.log(block.text);
        } else if ("name" in block) {
          console.log(`  [Tool: ${block.name}]`);
        }
      }
    } else if (message.type === "result") {
      result = message;
      if (message.subtype === "success") {
        console.log(`\nAgent completed successfully.`);
      } else {
        console.log(`\nAgent finished with status: ${message.subtype}`);
      }
      if (message.total_cost_usd) {
        console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      }
    }
  }

  return result;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

async function runWithSchedule() {
  console.log("Starting scheduled sync agent (runs every day at 6:00 AM AEST)...");
  console.log("Press Ctrl+C to stop.\n");

  // Run immediately on start
  await runAgent();

  // Then schedule daily at 6am AEST (20:00 UTC previous day)
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  function getNextRunTime() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(20, 0, 0, 0); // 6am AEST = 20:00 UTC
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  function scheduleNext() {
    const nextRun = getNextRunTime();
    const delay = nextRun.getTime() - Date.now();
    console.log(`\nNext sync scheduled for: ${nextRun.toISOString()} (${(delay / 3600000).toFixed(1)}h from now)`);

    setTimeout(async () => {
      try {
        await runAgent();
      } catch (err) {
        console.error("Scheduled sync failed:", err.message);
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}

// ─── Direct Sync (no Claude, just run the sync logic) ────────────────────────

async function runDirectSync() {
  try {
    const result = await syncDoctors();

    // Also print unverified summary
    const { data } = await supabase
      .from("doctors")
      .select("email, full_name, notes")
      .or("notes.like.%UNVERIFIED_DOCS%,notes.like.%UNVERIFIED_REFS%");

    if (data?.length > 0) {
      console.log("Doctors needing verification attention:");
      console.log("─".repeat(60));
      data.forEach(d => {
        const docMatch = d.notes?.match(/\[UNVERIFIED_DOCS:(\d+)\]/);
        const refMatch = d.notes?.match(/\[UNVERIFIED_REFS:(\d+)\]/);
        const parts = [];
        if (docMatch) parts.push(`${docMatch[1]} unverified docs`);
        if (refMatch) parts.push(`${refMatch[1]} unverified refs`);
        console.log(`  ${d.full_name || d.email}: ${parts.join(", ")}`);
      });
      console.log("─".repeat(60));
    }

    return result;
  } catch (err) {
    console.error("Sync failed:", err);
    process.exit(1);
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args[0] || "--direct";

switch (mode) {
  case "--agent":
    // Run with Claude Agent SDK (intelligent, can reason about results)
    runAgent(args[1]).catch(err => {
      console.error("Agent failed:", err);
      process.exit(1);
    });
    break;

  case "--schedule":
    // Run on a daily schedule with Claude Agent
    runWithSchedule().catch(err => {
      console.error("Scheduler failed:", err);
      process.exit(1);
    });
    break;

  case "--direct":
  default:
    // Run sync directly without Claude (faster, cheaper, no API key needed)
    runDirectSync().catch(err => {
      console.error("Direct sync failed:", err);
      process.exit(1);
    });
    break;
}
