import { createClient } from "@supabase/supabase-js";

import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Pipeline stages: Notion structure + HubSpot closed types
const STAGES = [
  { name: "Lead", position: 1, color: "#ec4899" },                  // pink
  { name: "Qualified", position: 2, color: "#f97316" },              // orange
  { name: "Proposal", position: 3, color: "#3b82f6" },               // blue
  { name: "Negotiation", position: 4, color: "#a855f7" },            // purple
  { name: "Closed (Pay Per Shift)", position: 5, color: "#22c55e" }, // green
  { name: "Closed (Subscription)", position: 6, color: "#10b981" },  // emerald
  { name: "Lost", position: 7, color: "#ef4444" },                   // red
];

// Hospitals from Notion pipeline + Gmail outreach (pipeline leads)
const PIPELINE_HOSPITALS = [
  { name: "Noosa Private Hospital", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Katherine Hospital", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Epworth Geelong Hospital", status: "pipeline", contact_name: "Prof Owen Roodenburg", contact_email: "owen.roodenburg@epworth.org.au", notes: "Staffing discussion" },
  { name: "PEHA", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Knox Private Hospital", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Alexandra District Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Bairnsdale Regional Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Colac Area Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Echuca Regional Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Bendigo Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Swan Hill District Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Yarrawonga District Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Albury Wodonga Health", status: "pipeline", contact_name: "Taylor Ogilvie", contact_email: "taylor.ogilvie2@awh.org.au", notes: "Intro sent Oct 2025" },
  { name: "Portland District Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Goulburn Valley Health", status: "pipeline", notes: "From Notion pipeline" },
  { name: "South West Healthcare Warrnambool", status: "pipeline", notes: "From Notion pipeline" },
  { name: "HEAL Specialist Urgent Care", status: "pipeline", notes: "From Notion pipeline" },
  { name: "ForHealth Group UCC", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Voxelrad", status: "pipeline", type: "Radiology", notes: "From Notion pipeline" },
  { name: "Oz Medico", status: "pipeline", notes: "From Notion pipeline" },
  { name: "South Brisbane Mater Private ED", status: "pipeline", notes: "From Notion pipeline" },
  { name: "MyFast Medical", status: "pipeline", notes: "From Notion pipeline" },
  { name: "Northern Beaches Healthscope", status: "pipeline", notes: "From Notion pipeline" },
  // Gmail outreach (not in Notion)
  { name: "Greenslopes / Ramsay Health", status: "pipeline", contact_name: "Maria", contact_email: "quioyom@ramsayhealth.com.au", notes: "Follow-up from Feb 2026 meeting" },
  { name: "HCPA (Healthcare Professionals Association)", status: "pipeline", type: "Clinic Network", contact_name: "Nikita", contact_email: "nikita@hcpassociation.com.au", notes: "Collaboration discussion for clinics" },
  { name: "Mildura Private Hospital", status: "pipeline", contact_name: "Josie", contact_email: "josiez@mildpriv.com.au", notes: "Intro sent Oct 2025" },
  { name: "Raiqa Health", status: "pipeline", contact_name: "Mohammed Javeed", contact_email: "mohammed.javeed@raiqa.health", notes: "Partnership discussion" },
  { name: "West Gippsland Healthcare Group", status: "pipeline", contact_email: "medical.workforce@wghg.com.au", notes: "Locum support inquiry" },
  { name: "AusRMS (Perisher/Mt Hotham)", status: "pipeline", type: "Alpine Medicine", contact_name: "Rachel", contact_email: "rachel@ausrms.com.au", notes: "Alpine medicine staffing" },
  { name: "HNC (178 clinics)", status: "pipeline", type: "Clinic Network", contact_name: "Kash Reddy", contact_email: "kreddy@hnc.org.au", notes: "Enterprise agreement discussion" },
  { name: "Valiant Health / NORTEC", status: "pipeline", contact_name: "Keeta", contact_email: "keetaj@nortec.org.au", notes: "Clinic account" },
  { name: "Medical One", status: "pipeline", type: "GP Network", contact_name: "Jill Monaghan", contact_email: "jmonaghan@medicalone.com.au", notes: "GP support discussion" },
  { name: "NSW Health", status: "pipeline", type: "Government", contact_name: "Sid Vohra", contact_email: "sid.vohra@health.nsw.gov.au", notes: "Government introductions. Also Lorcan Darling." },
  { name: "My Emergency Doctor", status: "pipeline", type: "Telehealth", contact_name: "Euan Murdoch", contact_email: "emurdoch@myemergencydr.com.au", notes: "Partnership intro" },
  { name: "Emergency Department (emdep.au)", status: "pipeline", contact_name: "Kelly", contact_email: "kelly@emdep.au", notes: "Knox related" },
  { name: "Ramsay Bundaberg", status: "pipeline", contact_name: "Mike Muller", contact_email: "mullerm@ramsayhealth.com.au", notes: "QLD doctors staffing" },
];

// Admin portal hospitals (currently on the platform)
const ADMIN_HOSPITALS = [
  { name: "Kalgoorlie Hospital", contact_name: "Kalgoorlie Hospital", contact_email: "slave0019@statdoctor.net", contact_phone: "0410868282", location: "Kalgoorlie Hospital, Piccadilly Street, Kalgoorlie WA, Australia", status: "active" },
  { name: "Mundubbera Multipurpose Health Service", contact_name: "Mundubbera Multipurpose Health Service", contact_email: "slave0018@statdoctor.net", contact_phone: "0410868282", location: "Mundubbera Multi-Purpose Health Service, Leichhardt St, Mundubbera QLD, Australia", status: "active" },
  { name: "Biggenden Multipurpose Health Centre", contact_name: "Biggenden Multipurpose Health Centre", contact_email: "slave0017@statdoctor.net", contact_phone: "0410868282", location: "Biggenden Hospital, Biggenden QLD, Australia", status: "active" },
  { name: "Monto Hospital", contact_name: "Monto", contact_email: "slave0016@statdoctor.net", contact_phone: "0410868282", location: "Monto Hospital, Flinders Street, Monto QLD, Australia", status: "active" },
  { name: "Eidsvold Multipurpose Health Service", contact_name: "Eidsvold Multipurpose Health Service", contact_email: "slave0015@statdoctor.net", contact_phone: "0410868282", location: "Eidsvold Hospital, Moreton St, Eidsvold QLD, Australia", status: "active" },
  { name: "Childers Hospital", contact_name: "Childers Hospital", contact_email: "slave0014@statdoctor.net", contact_phone: "0410868282", location: "Childers Hospital, Churchill Street, Childers QLD, Australia", status: "active" },
  { name: "Noosa Private Hospital", contact_name: "Noosa Private Hospital", contact_email: "slave0013@statdoctor.net", contact_phone: "0410868282", location: "Noosa Hospital, Lanyana Way, Noosaville QLD, Australia", status: "active" },
  { name: "Merri-bek Family Doctors", contact_name: "Merri-bek Family Doctors", contact_email: "slave0012@statdoctor.net", contact_phone: "0422839271", location: "Merri-bek Family Doctors, Pascoe Vale Road, Glenroy VIC, Australia", status: "active" },
  { name: "The Friendly Society Private Hospital - Bundaberg", contact_name: "The Friendly Society Private Hospital - Bundaberg", contact_email: "slave009@statdoctor.net", contact_phone: "0410868282", location: "The Friendly Society Private Hospital, Queen Street, Bundaberg QLD, Australia", status: "active" },
  { name: "Mater Private Hospital - Brisbane (PEHA)", contact_name: "Mater Private Hospital - Brisbane (PEHA)", contact_email: "slave008@statdoctor.net", contact_phone: "0410868282", location: "Mater Hospital Brisbane, Raymond Terrace, South Brisbane QLD, Australia", status: "active" },
  { name: "Mater Private Hospital - Rockhampton (PEHA)", contact_name: "Mater Private Hospital - Rockhampton (PEHA)", contact_email: "slave007@statdoctor.net", contact_phone: "0410868282", location: "Mater Private Hospital Rockhampton, Ward Street, Rockhampton QLD, Australia", status: "active" },
  { name: "Mater Private Hospital - Mackay (PEHA)", contact_name: "Mater Private Hospital - Mackay (PEHA)", contact_email: "slave006@statdoctor.net", contact_phone: "0410868282", location: "Mater Hospital, Bridge Road, West Mackay QLD, Australia", status: "active" },
  { name: "Mater Private Hospital - Townsville (PEHA)", contact_name: "Mater Private Hospital - Townsville (PEHA)", contact_email: "slave005@statdoctor.net", contact_phone: "0410868282", location: "Mater Private Hospital Townsville, Fulham Road, Pimlico QLD, Australia", status: "active" },
  { name: "Paraburdoo Medical Centre", contact_name: "Paraburdoo Medical Centre", contact_email: "slave004@statdoctor.net", contact_phone: "0410868282", location: "Paraburdoo Medical Centre, Ashburton Avenue, Paraburdoo WA, Australia", status: "active" },
  { name: "Gayndah Hospital", contact_name: "Gayndah Hospital", contact_email: "slave003@statdoctor.net", contact_phone: "0410868282", location: "Gayndah Hospital, Simon Street, Gayndah QLD, Australia", status: "active" },
  { name: "Maryborough Hospital (QLD)", contact_name: "Maryborough Hospital", contact_email: "slave002@statdoctor.net", contact_phone: "0410868282", location: "Maryborough Hospital, Walker Street, Maryborough QLD, Australia", status: "active" },
  { name: "Gin Gin Hospital", contact_name: "Gin Gin Hospital", contact_email: "slave001@statdoctor.net", contact_phone: "0410868282", location: "Gin Gin Hospital, Mulgrave Street, Gin Gin QLD, Australia", status: "active" },
  { name: "Hervey Bay Hospital", contact_name: "Hervey Bay Hospital", contact_email: "slave0@statdoctor.net", contact_phone: "0410868282", location: "Hervey Bay Hospital, Nissen Street, Urraween QLD, Australia", status: "active" },
  { name: "Bundaberg Hospital", contact_name: "Bundaberg Hospital", contact_email: "bundaberg@statdoctor.net", contact_phone: "0410868282", location: "Bundaberg Hospital, Bourbong Street, Bundaberg West QLD, Australia", status: "active" },
  { name: "Hollywood Private Hospital", contact_name: "Jemima", contact_email: "hollywood@statdoctor.net", contact_phone: "0406600399", location: "Hollywood Private Hospital, Monash Avenue, Nedlands WA, Australia", status: "active" },
  { name: "HEAL Specialist Urgent Care - Newcastle", contact_name: "Paul Baka", contact_email: "pbaka@healurgentcare.com.au", contact_phone: "0451333200", location: "HEAL Specialist Urgent Care - Newcastle, Hunter Street, Newcastle NSW, Australia", status: "active" },
  { name: "Yarrawonga Health", contact_name: "Kelly", contact_email: "yarrawonga@statdoctor.net", contact_phone: "0412345678", location: "Yarrawonga Health, Piper Street, Yarrawonga VIC, Australia", status: "active" },
  { name: "Alexandra District Health", contact_name: "Kaye", contact_email: "alexandra@statdoctor.net", contact_phone: "0412345678", location: "Alexandra District Health, Cooper Street, Alexandra VIC, Australia", status: "active" },
  { name: "Bendigo Health", contact_name: "Gemma", contact_email: "bendigo@statdoctor.net", contact_phone: "0412345678", location: "Bendigo Health, Barnard Street, Bendigo VIC, Australia", status: "active" },
  { name: "Hobart Private", contact_name: "Phillip Gaudin", contact_email: "hobart@statdoctor.net", contact_phone: "0450828219", location: "Hobart Private Hospital, Argyle Street, Hobart TAS, Australia", status: "active" },
  { name: "Central West Medical Centre", contact_name: "Dr Vivian Ndukwe", contact_email: "dr.vndukwe@gmail.com", contact_phone: "0419989323", location: "67 Ashley St, Braybrook VIC, Australia", status: "active" },
  { name: "MyFast Medical", contact_name: "Farhad", contact_email: "farhad@myfastmedical.com", contact_phone: "0406456826", location: "634-644 Mitcham Road, Vermont VIC, Australia", status: "active" },
  { name: "Echuca Regional Health", contact_name: "Kath Creme", contact_email: "medicalworkforceunit@erh.org.au", contact_phone: "0354855039", location: "Echuca Regional Health, Service Street, Echuca VIC, Australia", status: "active" },
  { name: "Kutjungka Region Clinics", contact_name: "June Gulati", contact_email: "june.gulati@kamsc.org.au", contact_phone: "0808919200", location: null, status: "active" },
  { name: "Woodburn Health GP Clinic", contact_name: "Chloe Morley", contact_email: "chloe@woodburnhealth.com.au", contact_phone: "0266822199", location: "Woodburn Health, River Street, Woodburn NSW, Australia", status: "active" },
  { name: "Holder Family Practice", contact_name: "Holder Family Practice", contact_email: "holder@statdoctor.net", contact_phone: "0410868282", location: "Holder Family Practice, Dixon Drive, Holder ACT, Australia", status: "active" },
  { name: "Fisher Family Practice", contact_name: "Fisher Family Practice", contact_email: "fisher@statdoctor.net", contact_phone: "0410868282", location: "Fisher Health Centre, Darwinia Terrace, Fisher ACT, Australia", status: "active" },
  { name: "Bendigo & District Aboriginal Cooperative", contact_name: "BDAC", contact_email: "bdac@statdoctor.net", contact_phone: "0412345678", location: "Bendigo & District Aboriginal Co-operative, Mundy Street, Bendigo VIC, Australia", status: "active" },
  { name: "Jirra Jirra Medical Clinic", contact_name: "BDAC", contact_email: "jirajirra@statdoctor.net", contact_phone: "0412345678", location: "Jirra Jirra Medical Clinic, Myers Flat VIC, Australia", status: "active" },
  { name: "Corella Family Practice", contact_name: "Grace Tan", contact_email: "corella@statdoctor.net", contact_phone: "0412345678", location: "Corella Family Practice, 94 Urquhart Street, Castlemaine VIC, Australia", status: "active" },
  { name: "Maryborough District Health Service", contact_name: "Sally", contact_email: "maryborough@statdoctor.net", contact_phone: "0412345678", location: "Maryborough District Health Service, Clarendon Street, Maryborough VIC, Australia", status: "active" },
  { name: "Castlemaine Health", contact_name: "Noel", contact_email: "castlemaine@statdoctor.net", contact_phone: "0412345678", location: "Castlemaine Health, Cornish Street, Castlemaine VIC, Australia", status: "active" },
  { name: "Maldon Hospital", contact_name: "Colleen Hewett", contact_email: "maldon@statdoctor.net", contact_phone: "0412345678", location: "Maldon Hospital, Chapel Street, Maldon VIC, Australia", status: "active" },
  { name: "BSOL Practice", contact_name: "BSOL", contact_email: "bsol@statdoctor.net", contact_phone: "0412345678", location: "BSOL, Kangaroo Flat VIC, Australia", status: "active" },
  { name: "Kyneton District Health", contact_name: "Caroline", contact_email: "kyneton@statdoctor.net", contact_phone: "0412345678", location: "Kyneton District Health, Caroline Chisholm Drive, Kyneton VIC, Australia", status: "active" },
  { name: "Cobaw Community Health", contact_name: "Amy Baker", contact_email: "cobaw@statdoctor.net", contact_phone: "0412345678", location: "Cobaw Community Health, Mollison Street, Kyneton VIC, Australia", status: "active" },
  { name: "Bendigo Hospital", contact_name: "Anurag Dhar", contact_email: "anurag@statdoctor.net", contact_phone: "0450828219", location: "Bendigo Hospital, Lucan Street, Bendigo VIC, Australia", status: "active" },
  { name: "Peter Mac", contact_name: "Peter Mac", contact_email: "peter@statdoctor.net", contact_phone: "0412345678", location: "Peter MacCallum Cancer Centre, Grattan Street, Melbourne VIC, Australia", status: "active" },
  { name: "Royal Melbourne Hospital", contact_name: "Anurag Dhar", contact_email: "anurag@statdoctor.net", contact_phone: "0450828219", location: "Royal Melbourne Hospital, Grattan Street, Parkville VIC, Australia", status: "active" },
];

// Skip test/internal entries from admin portal
const SKIP_NAMES = ["Test858585", "StatDoctor", "One Hospital", "Jirra Jirra", "My First Hospital"];

async function run() {
  // Step 1: Wipe everything and start fresh
  console.log("Cleaning up existing data...");
  await supabase.from("hospital_deals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("hospitals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("hospital_pipeline_stages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✓ Cleared old data\n");

  // Step 2: Insert HubSpot-style pipeline stages
  console.log("Creating HubSpot pipeline stages...");
  const { data: stages, error: stageErr } = await supabase
    .from("hospital_pipeline_stages")
    .insert(STAGES)
    .select();
  if (stageErr) { console.error("Stage error:", stageErr); return; }
  console.log(`✓ ${stages.length} stages created:`);
  stages.forEach(s => console.log(`  ${s.name} (pos ${s.position})`));

  const stageMap = Object.fromEntries(stages.map(s => [s.name, s.id]));

  // Step 3: Insert pipeline hospitals (Notion + Gmail) with deals in "Lead Generated" or "Outreach Made"
  console.log("\nInserting pipeline hospitals...");
  let pos = 0;
  let pipelineCount = 0;

  // Track names to avoid duplicates between pipeline and admin lists
  const insertedNames = new Set();

  for (const h of PIPELINE_HOSPITALS) {
    // Skip if already in admin list as active (we'll add from admin with full details)
    const adminMatch = ADMIN_HOSPITALS.find(a =>
      a.name.toLowerCase().includes(h.name.toLowerCase().split(" ")[0]) &&
      a.name.toLowerCase().includes(h.name.toLowerCase().split(" ").slice(-1)[0])
    );

    // Some pipeline entries overlap with admin (e.g. Noosa, Echuca, Bendigo Health, etc.)
    // For overlapping ones, skip here - they'll be added as "active" from admin list
    const normalizedName = h.name.toLowerCase().replace(/[^a-z]/g, "");
    const isInAdmin = ADMIN_HOSPITALS.some(a => {
      const an = a.name.toLowerCase().replace(/[^a-z]/g, "");
      return an === normalizedName || an.includes(normalizedName) || normalizedName.includes(an);
    });

    if (isInAdmin) {
      console.log(`  ⊘ ${h.name} → skipped (already active on platform)`);
      continue;
    }

    const { data: hospital, error: hErr } = await supabase
      .from("hospitals")
      .insert(h)
      .select()
      .single();
    if (hErr) { console.error(`  ✗ ${h.name}: ${hErr.message}`); continue; }

    const stageId = h.contact_email ? stageMap["Qualified"] : stageMap["Lead"];
    await supabase.from("hospital_deals").insert({
      hospital_id: hospital.id,
      name: `${h.name} - Initial Deal`,
      value: 0,
      stage_id: stageId,
      position: pos++,
    });

    insertedNames.add(h.name);
    pipelineCount++;
    console.log(`  ✓ ${h.name} → ${h.contact_email ? "Qualified" : "Lead"}`);
  }

  // Step 4: Insert admin portal hospitals as active (on platform) with deals in "Closed"
  console.log("\nInserting admin portal hospitals (active on platform)...");
  let activeCount = 0;

  for (const h of ADMIN_HOSPITALS) {
    if (SKIP_NAMES.includes(h.name)) {
      console.log(`  ⊘ ${h.name} → skipped (test/internal)`);
      continue;
    }

    const { data: hospital, error: hErr } = await supabase
      .from("hospitals")
      .insert(h)
      .select()
      .single();
    if (hErr) { console.error(`  ✗ ${h.name}: ${hErr.message}`); continue; }

    await supabase.from("hospital_deals").insert({
      hospital_id: hospital.id,
      name: `${h.name} - Active Account`,
      value: 0,
      stage_id: stageMap["Closed (Pay Per Shift)"],
      position: pos++,
    });

    activeCount++;
    console.log(`  ✓ ${h.name} → Closed Cost-Per-Shifts`);
  }

  // Activity feed
  await supabase.from("activity_feed").insert({
    module: "hospitals",
    action: "bulk_import",
    summary: `Imported ${pipelineCount} pipeline + ${activeCount} active hospitals from Notion, Gmail & admin portal`,
    metadata: { pipelineCount, activeCount },
  });

  console.log(`\n✓ Done! ${pipelineCount} pipeline + ${activeCount} active = ${pipelineCount + activeCount} total hospitals`);
}

run().catch(console.error);
