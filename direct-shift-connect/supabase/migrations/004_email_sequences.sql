-- Email Sequence Automation Tables
-- Stores email flows, enrollments, and send logs

-- ============================================
-- EMAIL FLOWS (replaces localStorage)
-- ============================================
create table public.email_flows (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  audience text not null check (audience in ('hospitals', 'doctors', 'investors')),
  status text default 'draft' check (status in ('draft', 'active', 'paused')),
  steps jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- EMAIL ENROLLMENTS
-- ============================================
create table public.email_enrollments (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references public.email_flows on delete cascade not null,
  entity_type text not null check (entity_type in ('hospital', 'doctor', 'investor')),
  entity_id uuid not null,
  entity_name text,
  entity_email text not null,
  current_step_index integer default 0,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  next_send_at timestamptz,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- ============================================
-- EMAIL SEND LOG
-- ============================================
create table public.email_send_log (
  id uuid default gen_random_uuid() primary key,
  enrollment_id uuid references public.email_enrollments on delete cascade not null,
  flow_id uuid not null,
  step_index integer not null,
  subject text,
  recipient_email text not null,
  status text default 'draft_created' check (status in ('draft_created', 'sent', 'failed', 'skipped')),
  gmail_draft_id text,
  gmail_message_id text,
  created_at timestamptz default now(),
  sent_at timestamptz
);

-- Indexes
create index idx_enrollments_status_next on public.email_enrollments (status, next_send_at);
create index idx_enrollments_flow on public.email_enrollments (flow_id);
create index idx_enrollments_entity on public.email_enrollments (entity_type, entity_id);
create index idx_send_log_enrollment on public.email_send_log (enrollment_id);

-- RLS
alter table public.email_flows enable row level security;
alter table public.email_enrollments enable row level security;
alter table public.email_send_log enable row level security;

create policy "Authenticated users full access" on public.email_flows
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.email_enrollments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated users full access" on public.email_send_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Updated_at triggers
create trigger set_email_flows_updated
  before update on public.email_flows
  for each row execute procedure public.set_updated_at();

create trigger set_email_enrollments_updated
  before update on public.email_enrollments
  for each row execute procedure public.set_updated_at();

-- Seed default flows
insert into public.email_flows (name, description, audience, status, steps) values
(
  'Hospital Onboarding',
  'Welcome sequence for new hospital sign-ups',
  'hospitals',
  'active',
  '[{"id":"s1","type":"email","subject":"Welcome to StatDoctor – Let''s get you set up","body":"Hi {{name}},\n\nWelcome to StatDoctor! We''re thrilled to have your hospital on board.\n\nStatDoctor is the easiest way to fill locum shifts — no agencies, no middlemen. Here''s what makes us different:\n\n• Direct connection with verified doctors\n• No placement fees or commissions\n• Post shifts in under 60 seconds\n• Real-time notifications when doctors apply\n\nTo get started, simply log into your dashboard and post your first shift. Our team is here to help every step of the way.\n\nBest regards,\nAnurag\nCo-Founder, StatDoctor"},{"id":"s2","type":"delay","delayDays":3},{"id":"s3","type":"email","subject":"Have you posted your first shift yet?","body":"Hi {{name}},\n\nJust checking in — have you had a chance to post your first shift on StatDoctor?\n\nIf you need any help getting set up, I''m happy to jump on a quick 10-minute call to walk you through the process.\n\nHere''s what other hospitals love about the platform:\n\n• Fill shifts 3x faster than traditional agencies\n• Save up to 30% on locum costs\n• Access a growing pool of 250+ verified doctors\n\nWould any time this week work for a quick chat?\n\nBest,\nAnurag\nCo-Founder, StatDoctor"},{"id":"s4","type":"delay","delayDays":5},{"id":"s5","type":"email","subject":"Quick tips to get the most out of StatDoctor","body":"Hi {{name}},\n\nI wanted to share a few tips that our most successful hospitals use:\n\n1. Post shifts at least 2 weeks in advance — you''ll get 3x more applications\n2. Include shift details (department, requirements) — doctors apply faster to detailed posts\n3. Set up recurring shifts — save time on repeat rosters\n4. Respond to applications within 24 hours — top doctors get snapped up quickly\n\nIf you''d like a personalised demo or have any questions, just reply to this email.\n\nWe''re building StatDoctor to make your life easier — your feedback matters!\n\nBest,\nAnurag\nCo-Founder, StatDoctor"}]'::jsonb
),
(
  'Hospital Cold Outreach',
  'Cold outreach sequence for prospective hospitals',
  'hospitals',
  'active',
  '[{"id":"c1","type":"email","subject":"Filling locum shifts without agency fees","body":"Hi {{name}},\n\nI''m Anurag, co-founder of StatDoctor. We help hospitals fill locum shifts directly — without agency fees.\n\nI noticed your hospital may be looking for a more efficient way to manage locum staffing. StatDoctor connects you directly with verified doctors, saving you time and money.\n\nHere''s what we offer:\n\n• No placement fees or commissions\n• 250+ verified doctors on the platform\n• Post shifts and receive applications within hours\n• Simple dashboard — post a shift in under 60 seconds\n\nWould you be open to a quick 15-minute call to see if StatDoctor could help?\n\nBest regards,\nAnurag\nCo-Founder, StatDoctor\nanu@statdoctor.net"},{"id":"c2","type":"delay","delayDays":4},{"id":"c3","type":"email","subject":"Re: Filling locum shifts without agency fees","body":"Hi {{name}},\n\nJust wanted to follow up on my previous email about StatDoctor.\n\nI understand you''re busy — here''s a 30-second summary:\n\nStatDoctor = post a shift → doctors apply → you choose → done. No agencies.\n\nHospitals using StatDoctor are saving an average of 30% on locum costs. Happy to show you a quick demo if you''re interested.\n\nBest,\nAnurag"},{"id":"c4","type":"delay","delayDays":7},{"id":"c5","type":"email","subject":"Last follow up — StatDoctor for {{name}}","body":"Hi {{name}},\n\nThis is my final follow up — I don''t want to spam your inbox!\n\nIf you''re ever looking for an easier way to fill locum shifts without agency fees, StatDoctor is here. You can check us out at statdoctor.app.\n\nNo pressure at all — just wanted to make sure you knew the option exists.\n\nWishing you and your team all the best.\n\nCheers,\nAnurag\nCo-Founder, StatDoctor"}]'::jsonb
),
(
  'Doctor Re-engagement',
  'Re-engage inactive doctors who haven''t applied to shifts',
  'doctors',
  'active',
  '[{"id":"d1","type":"email","subject":"New locum shifts available near you","body":"Hi {{name}},\n\nWe''ve noticed you haven''t checked StatDoctor in a while — and there are some great shifts waiting!\n\nHospitals are actively looking for doctors like you. Here''s what''s new:\n\n• New shifts posted daily across Australia\n• Flexible scheduling — pick the shifts that work for you\n• Transparent pay rates — no agency cuts\n\nLog back in and browse the latest shifts. Your next locum opportunity could be one tap away.\n\nBest,\nThe StatDoctor Team"},{"id":"d2","type":"delay","delayDays":5},{"id":"d3","type":"email","subject":"Doctors are earning more with StatDoctor","body":"Hi {{name}},\n\nQuick update — doctors on StatDoctor are earning more because there are no agency fees eating into their pay.\n\nHere''s how it works:\n\n1. Browse available shifts on the app\n2. Apply to the ones you like\n3. Work directly with the hospital — no middleman\n\nIt''s that simple. And the best part? You keep more of what you earn.\n\nSee you on the platform!\n\nBest,\nThe StatDoctor Team"}]'::jsonb
),
(
  'Agency-Listed Hospital Outreach',
  'Target hospitals posting locum shifts through agencies — pitch StatDoctor as a cheaper direct alternative',
  'hospitals',
  'active',
  '[{"id":"a1","type":"email","subject":"Noticed you''re hiring locum doctors — there''s a cheaper way","body":"Hi {{name}},\n\nI''m Anurag from StatDoctor. I came across your hospital''s locum listings and wanted to reach out.\n\nWe built StatDoctor specifically to help hospitals like yours fill locum shifts without the agency markup. Here''s the difference:\n\nAgency route: Post with an agency → pay 20-30% on top → limited visibility into who applies\nStatDoctor: Post directly → verified doctors apply within hours → zero commission\n\nWe have 250+ verified doctors across Australia already on the platform. Hospitals that have switched are saving an average of 30% per locum placement.\n\nWould you be open to a 10-minute call to see if it could work for your ED?\n\nBest,\nAnurag\nCo-Founder, StatDoctor\nanu@statdoctor.net"},{"id":"a2","type":"delay","delayDays":3},{"id":"a3","type":"email","subject":"Re: Locum staffing without the agency fees","body":"Hi {{name}},\n\nQuick follow up — I know how hectic running an ED can be, so I''ll keep this brief.\n\nStatDoctor is free for hospitals to use. You post a shift, doctors apply, you pick who you want. No contracts, no commissions, no lock-in.\n\nHere''s what takes 60 seconds on our platform:\n1. Post your shift details (dates, rates, requirements)\n2. Get notified as verified doctors apply\n3. Confirm the doctor you want — done\n\nWe handle the verification so you don''t have to chase documents. Every doctor on the platform has verified credentials, references, and AHPRA registration.\n\nHappy to set up a quick demo if you''d like to see it in action.\n\nCheers,\nAnurag"},{"id":"a4","type":"delay","delayDays":5},{"id":"a5","type":"email","subject":"What {{name}} could save on locum costs","body":"Hi {{name}},\n\nLast one from me — I promise!\n\nI ran some quick numbers. If your ED fills even 2 locum shifts per month through agencies, you''re likely paying $5,000–$15,000 in placement fees alone.\n\nWith StatDoctor, that cost drops to $0. Same quality doctors, same speed, zero commission.\n\nIf the timing isn''t right now, no worries at all. But when you''re ready to try a different approach to locum staffing, we''re here: statdoctor.app\n\nAll the best to you and your team.\n\nCheers,\nAnurag\nCo-Founder, StatDoctor"}]'::jsonb
),
(
  'ACEM Job Board Hospital Outreach',
  'Tailored sequence for hospitals found posting on the ACEM job board',
  'hospitals',
  'active',
  '[{"id":"m1","type":"email","subject":"Saw your ACEM listing — a quicker way to fill ED shifts","body":"Hi {{name}},\n\nI noticed your hospital has positions listed on the ACEM job board — so I know you''re actively building your ED team.\n\nWhile ACEM is great for training positions, if you also need to fill locum or short-term shifts, I wanted to introduce StatDoctor.\n\nWe''re an Australian platform that connects hospitals directly with verified emergency doctors — no agencies, no placement fees. Hospitals post a shift and get applications within hours.\n\nWhat makes us different:\n• Every doctor is credential-verified (AHPRA, references, documents)\n• Zero commission — hospitals and doctors connect directly\n• Post a shift in under 60 seconds from your dashboard\n• 250+ doctors across Australia already on the platform\n\nWould a quick 15-minute call be useful to explore how StatDoctor could complement your existing recruitment?\n\nBest regards,\nAnurag\nCo-Founder, StatDoctor\nanu@statdoctor.net"},{"id":"m2","type":"delay","delayDays":4},{"id":"m3","type":"email","subject":"Re: Quick way to fill ED locum shifts","body":"Hi {{name}},\n\nJust circling back on my earlier email. I know recruiting for ED is always a juggle.\n\nOne thing I hear from ED directors is that agency locums are expensive and unpredictable. StatDoctor fixes both:\n\n• You control the rates (post what you''re willing to pay)\n• You see who''s applying and their full profile\n• Doctors are verified before they even apply to your shifts\n\nSeveral hospitals have told us they fill shifts 3x faster than going through an agency, and at a fraction of the cost.\n\nHappy to send through a quick demo link or jump on a call — whatever works best.\n\nCheers,\nAnurag"},{"id":"m4","type":"delay","delayDays":6},{"id":"m5","type":"email","subject":"Final thought on locum staffing for your ED","body":"Hi {{name}},\n\nThis is my last follow up — I don''t want to be that person!\n\nIf your hospital ever needs a fast, free way to find verified locum doctors for your ED, StatDoctor is here. No setup fees, no contracts, no commission.\n\nYou can check us out anytime at statdoctor.app or just reply to this email and I''ll personally walk you through it.\n\nWishing your ED team all the best — it''s tough work and you''re doing an incredible job.\n\nCheers,\nAnurag\nCo-Founder, StatDoctor"}]'::jsonb
);
