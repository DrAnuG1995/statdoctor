import { createClient } from "@supabase/supabase-js";

import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Investors from Notion Fundraising Tracker + HubSpot + Gmail
const INVESTORS = [
  { name: "Aaron Shelley", email: "aaron.shelley@beachhead.vc", partner_name: "Aaron Shelley", status: "contacted", notes: "Beachhead VC. Imported from HubSpot." },
  { name: "Access Healthcare", email: "anurag.jain@accesshealthcare.com", partner_name: "Anurag Jain", status: "contacted", notes: "Outreach email sent Mar 4, 2026. No response." },
  { name: "Alki Georgallis", email: "alki.georgallis@gmail.com", partner_name: "Alki Georgallis", status: "contacted", notes: "Imported from HubSpot." },
  { name: "Anthony Bilardo", email: "abilardo@gmail.com", partner_name: "Anthony Bilardo", status: "contacted", notes: "Imported from HubSpot." },
  { name: "CincyTech", email: "slee@cincytechusa.com", partner_name: "Sam Lee", status: "contacted", notes: "Outreach email sent Mar 4, 2026. No response." },
  { name: "Farnam", email: "david.fox@farnam.com.au", partner_name: "David Fox", status: "contacted", notes: "Outreach email sent Mar 5, 2026. No response." },
  { name: "Fledgily", email: "Nick@fledgily.com", partner_name: "Nick Hardy", status: "contacted", notes: "Follow-up sent Jan 2026. No response since Dec 2025." },
  { name: "Future Super", email: "david.barton@myfuturesuper.com.au", partner_name: "David Barton", status: "contacted", notes: "Outreach email sent Mar 4, 2026. No response." },
  { name: "Global Investors", email: "info@globalinvestors.com.au", partner_name: null, status: "contacted", notes: "From HubSpot." },
  { name: "Grok Ventures", email: "hi@grok.ventures", partner_name: null, status: "contacted", notes: "Imported from HubSpot." },
  { name: "Henry Patishman", email: "hp_home@hotmail.com", partner_name: "Henry Patishman", status: "contacted", notes: "Imported from HubSpot." },
  { name: "IPA Equities", email: "kh@ipaequities.com", partner_name: "Keith H", status: "lost", notes: "Via Australian Investment Network. Declined Jan 2026 — concept interesting but too early stage." },
  { name: "Jonathan Hoe", email: "jonathan@nashadvisory.com.au", partner_name: "Jonathan Hoe", status: "contacted", notes: "Associate Director, Nash Advisory. Imported from HubSpot." },
  { name: "Lin Chen", email: "lin@medimark.com.au", partner_name: "Lin Chen", status: "contacted", notes: "Medical Marketing Director. Imported from HubSpot." },
  { name: "LvlUp Labs", email: "thomas@lvlup.vc", partner_name: "Thomas Davis", status: "pitched", notes: "VC/Accelerator — Marketing Edge Accelerator. Screening process underway March 2026." },
  { name: "Medical Angels", email: null, partner_name: null, status: "lost", notes: "Medical-specific angel network." },
  { name: "Melbourne Angels", email: "treasurer@melbourneangels.com", partner_name: null, status: "contacted", notes: "Imported from HubSpot." },
  { name: "Payal", email: "drpayaldelhi@gmail.com", partner_name: "Payal", status: "contacted", notes: "Imported from HubSpot." },
  { name: "Randor Falconer", email: "randorfalconer1@gmail.com", partner_name: "Randor Falconer", status: "contacted", notes: "Imported from HubSpot." },
  { name: "Samantha Cutts", email: "samantha.cutts@jinding.com.au", partner_name: "Samantha Cutts", status: "contacted", notes: "Imported from HubSpot." },
  { name: "SHC Capital Holdings", email: "teosookiat@shccapitalholdings.com", partner_name: "Teo Sook Iat", status: "contacted", notes: "Singapore-based. Offered 'Funding Partnership'. Caution: unsolicited outreach." },
  { name: "Sid Jaiswal", email: "sidjaiswal2613@gmail.com", partner_name: "Sid Jaiswal", status: "contacted", notes: "Imported from HubSpot." },
  { name: "Simon Murphy", email: "simon.murphy@unimelb.edu.au", partner_name: "Simon Murphy", status: "contacted", notes: "Imported from HubSpot." },
  { name: "TEN13", email: "investments@ten13.vc", partner_name: null, status: "contacted", notes: "Imported from HubSpot." },
  { name: "Utiliti", email: "josh@utiliti.com", partner_name: "Josh Ayscough", status: "pitched", notes: "Met at ANDHealth Dec 2025. Wanted $100K ARR — now hit. Said happy to re-review. Strong prospect." },
  { name: "Will", email: "will@nashadvisory.com.au", partner_name: "Will", status: "contacted", notes: "Nash Advisory. Imported from HubSpot." },
];

// Investor updates (from Google Doc)
const UPDATES = [
  {
    title: "StatDoctor – Investor Update",
    month: "2026-02",
    content: {
      fundraising: [
        "Continued outreach to angel networks and VCs",
        "Applied to LvlUp Labs Marketing Edge Accelerator"
      ],
      productSales: [
        "Growing doctor base through paid ads",
        "Building hospital pipeline across VIC, QLD, WA"
      ],
      focusThisMonth: [
        "Close first angel round commitments",
        "Scale doctor acquisition through paid ads",
        "Convert pipeline hospitals"
      ],
      metrics: {
        headers: ["Metric", "January", "February"],
        rows: [
          ["Cash in Holding", "$35K", "$50K"],
          ["Cash in Trading", "$28K", "$37K"],
          ["Hospital Sales", "$8,200", "$11,161"]
        ]
      }
    },
  },
  {
    title: "StatDoctor – Investor Update",
    month: "2026-03",
    content: {
      fundraising: [
        "$65,000 raised in March",
        "2 new investors joined ($25K and $40K)",
        "$110K allocated through Aussie Angels (Closes at $200K)",
        "Ongoing raise targeting $1M total"
      ],
      productSales: [
        "Crossed $100K ARR in the last 12 months",
        "Growing at 3-5 doctors per day since starting ads with about $2 CAC",
        "Interested contracts in the telehealth sector"
      ],
      focusThisMonth: [
        "Closing the Aussie Angels round by end of April",
        "Legal: Getting shareholder agreement, ESOP and more sorted",
        "Scaling doctor acquisition through paid ads and targeted marketing",
        "Converting hospital pipeline into active subscriptions"
      ],
      metrics: {
        headers: ["Metric", "February", "March"],
        rows: [
          ["Cash in Holding", "$50K", "$65K"],
          ["Cash in Trading", "$37K", "$46K"],
          ["Hospital Sales", "$11,161", "$30K"]
        ]
      },
      monthlyTargets: {
        headers: ["Area", "Monthly Target"],
        rows: [
          ["Capital Raised", "$50K–$100K"],
          ["New Hospitals", "4"],
          ["New Doctors", "90"]
        ]
      }
    },
  },
];

async function run() {
  console.log("Seeding investors...\n");

  // Clear existing investors
  await supabase.from("investor_updates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("investors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✓ Cleared old investor data\n");

  // Insert investors
  let count = 0;
  for (const inv of INVESTORS) {
    const { error } = await supabase.from("investors").insert({
      name: inv.name,
      email: inv.email,
      partner_name: inv.partner_name,
      status: inv.status,
      invested: false,
      investment_amount: 0,
      notes: inv.notes,
    });
    if (error) {
      console.error(`  ✗ ${inv.name}: ${error.message}`);
    } else {
      count++;
      console.log(`  ✓ ${inv.name} → ${inv.status}`);
    }
  }
  console.log(`\n✓ ${count} investors inserted\n`);

  // Insert investor updates
  console.log("Inserting investor updates...");
  for (const update of UPDATES) {
    const { error } = await supabase.from("investor_updates").insert({
      title: update.title,
      month: update.month,
      content: update.content,
    });
    if (error) {
      console.error(`  ✗ ${update.month}: ${error.message}`);
    } else {
      console.log(`  ✓ ${update.month}`);
    }
  }

  console.log("\n✓ Done!");
}

run().catch(console.error);
