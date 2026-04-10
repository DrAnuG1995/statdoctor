import { createClient } from "@supabase/supabase-js";

import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Pipeline stages matching the Notion schema
const STAGES = [
  { name: "Lead", position: 1, color: "#94a3b8" },
  { name: "Contacted", position: 2, color: "#60a5fa" },
  { name: "Qualified", position: 3, color: "#a78bfa" },
  { name: "Proposal", position: 4, color: "#f59e0b" },
  { name: "Negotiation", position: 5, color: "#f97316" },
  { name: "Closed Won", position: 6, color: "#22c55e" },
  { name: "Closed Lost", position: 7, color: "#ef4444" },
];

// Combined hospital data from Notion pipeline + Gmail outreach
// Source field indicates where the lead was found
const HOSPITALS = [
  // === From Notion Pipeline ===
  { name: "Noosa Private Hospital", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Katherine Hospital", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Epworth Geelong Hospital", status: "pipeline", source: "notion", contact_name: "Prof Owen Roodenburg", contact_email: "owen.roodenburg@epworth.org.au", notes: "Staffing discussion. From Notion pipeline + Gmail" },
  { name: "PEHA", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Knox Private Hospital", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Alexandra District Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Bairnsdale Regional Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Colac Area Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Echuca Regional Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Bendigo Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Swan Hill District Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Yarrawonga District Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Albury Wodonga Health", status: "pipeline", source: "notion", contact_name: "Taylor Ogilvie", contact_email: "taylor.ogilvie2@awh.org.au", notes: "Intro sent Oct 2025. From Notion pipeline + Gmail" },
  { name: "Portland District Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Goulburn Valley Health", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "South West Healthcare Warrnambool", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "HEAL Specialist Urgent Care", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "ForHealth Group UCC", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Voxelrad", status: "pipeline", source: "notion", type: "Radiology", notes: "From Notion pipeline" },
  { name: "Oz Medico", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "South Brisbane Mater Private ED", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "MyFast Medical", status: "pipeline", source: "notion", notes: "From Notion pipeline" },
  { name: "Northern Beaches Healthscope", status: "pipeline", source: "notion", notes: "From Notion pipeline" },

  // === From Gmail outreach (not in Notion) ===
  { name: "Greenslopes / Ramsay Health", status: "pipeline", source: "gmail", contact_name: "Maria", contact_email: "quioyom@ramsayhealth.com.au", notes: "Follow-up from Feb 2026 meeting" },
  { name: "HCPA (Healthcare Professionals Association)", status: "pipeline", source: "gmail", type: "Clinic Network", contact_name: "Nikita", contact_email: "nikita@hcpassociation.com.au", notes: "Collaboration discussion for clinics" },
  { name: "Mildura Private Hospital", status: "pipeline", source: "gmail", contact_name: "Josie", contact_email: "josiez@mildpriv.com.au", notes: "Intro sent Oct 2025" },
  { name: "Raiqa Health", status: "pipeline", source: "gmail", contact_name: "Mohammed Javeed", contact_email: "mohammed.javeed@raiqa.health", notes: "Partnership discussion" },
  { name: "West Gippsland Healthcare Group", status: "pipeline", source: "gmail", contact_email: "medical.workforce@wghg.com.au", notes: "Locum support inquiry" },
  { name: "AusRMS (Perisher/Mt Hotham)", status: "pipeline", source: "gmail", type: "Alpine Medicine", contact_name: "Rachel", contact_email: "rachel@ausrms.com.au", notes: "Alpine medicine staffing" },
  { name: "HNC (178 clinics)", status: "pipeline", source: "gmail", type: "Clinic Network", contact_name: "Kash Reddy", contact_email: "kreddy@hnc.org.au", notes: "Enterprise agreement discussion" },
  { name: "Valiant Health / NORTEC", status: "pipeline", source: "gmail", contact_name: "Keeta", contact_email: "keetaj@nortec.org.au", notes: "Clinic account" },
  { name: "Medical One", status: "pipeline", source: "gmail", type: "GP Network", contact_name: "Jill Monaghan", contact_email: "jmonaghan@medicalone.com.au", notes: "GP support discussion" },
  { name: "NSW Health", status: "pipeline", source: "gmail", type: "Government", contact_name: "Sid Vohra", contact_email: "sid.vohra@health.nsw.gov.au", notes: "Government introductions. Also Lorcan Darling." },
  { name: "My Emergency Doctor", status: "pipeline", source: "gmail", type: "Telehealth", contact_name: "Euan Murdoch", contact_email: "emurdoch@myemergencydr.com.au", notes: "Partnership intro" },
  { name: "Emergency Department (emdep.au)", status: "pipeline", source: "gmail", contact_name: "Kelly", contact_email: "kelly@emdep.au", notes: "Knox related" },
  { name: "Ramsay Bundaberg", status: "pipeline", source: "gmail", contact_name: "Mike Muller", contact_email: "mullerm@ramsayhealth.com.au", notes: "QLD doctors staffing" },
];

async function seed() {
  console.log("Seeding pipeline stages...");
  const { data: stages, error: stageErr } = await supabase
    .from("hospital_pipeline_stages")
    .insert(STAGES)
    .select();

  if (stageErr) {
    console.error("Stage insert error:", stageErr);
    return;
  }
  console.log(`✓ ${stages.length} pipeline stages created`);

  // Find the "Lead" and "Contacted" stage IDs
  const leadStage = stages.find((s) => s.name === "Lead");
  const contactedStage = stages.find((s) => s.name === "Contacted");

  console.log("\nInserting hospitals...");
  let dealPosition = 0;
  let successCount = 0;

  for (const h of HOSPITALS) {
    const { source, ...hospitalData } = h;
    const { data: hospital, error: hErr } = await supabase
      .from("hospitals")
      .insert(hospitalData)
      .select()
      .single();

    if (hErr) {
      console.error(`✗ ${h.name}: ${hErr.message}`);
      continue;
    }

    // Create a deal in the pipeline - put contacted ones (with email) in "Contacted", others in "Lead"
    const stageId = h.contact_email ? contactedStage.id : leadStage.id;
    const { error: dErr } = await supabase.from("hospital_deals").insert({
      hospital_id: hospital.id,
      name: `${h.name} - Initial Deal`,
      value: 0,
      stage_id: stageId,
      position: dealPosition++,
      notes: `Source: ${source}`,
    });

    if (dErr) {
      console.error(`  Deal error for ${h.name}: ${dErr.message}`);
    }

    successCount++;
    console.log(`✓ ${h.name} → ${h.contact_email ? "Contacted" : "Lead"}`);
  }

  // Also log to activity feed
  const { error: actErr } = await supabase.from("activity_feed").insert({
    module: "hospitals",
    action: "bulk_import",
    summary: `Imported ${successCount} hospitals from Notion pipeline and Gmail outreach`,
    metadata: { source: "notion+gmail", count: successCount },
  });
  if (actErr) console.error("Activity feed error:", actErr.message);

  console.log(`\n✓ Done! ${successCount}/${HOSPITALS.length} hospitals seeded.`);
}

seed().catch(console.error);
