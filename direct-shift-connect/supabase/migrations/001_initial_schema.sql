-- StatDoctor CRM Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text default 'admin' check (role in ('admin', 'manager', 'sales', 'marketing', 'viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- DOCTORS MODULE
-- ============================================
create table public.doctors (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text,
  phone text,
  status text default 'pipeline' check (status in ('active', 'pipeline', 'unsubscribed', 'deleted')),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  app_downloaded boolean default false,
  specialty text,
  location text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.doctor_activities (
  id uuid default gen_random_uuid() primary key,
  doctor_id uuid references public.doctors on delete cascade not null,
  action text not null,
  summary text,
  metadata jsonb default '{}',
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create index idx_doctors_status on public.doctors(status);
create index idx_doctor_activities_doctor on public.doctor_activities(doctor_id);

-- ============================================
-- HOSPITALS MODULE
-- ============================================
create table public.hospitals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text,
  location text,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text default 'pipeline' check (status in ('active', 'pipeline', 'pending', 'churned')),
  subscription_tier text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.hospital_pipeline_stages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  position integer not null,
  color text default '#6B7280'
);

-- Seed default pipeline stages
insert into public.hospital_pipeline_stages (name, position, color) values
  ('Lead', 0, '#6B7280'),
  ('Contacted', 1, '#3B82F6'),
  ('Demo', 2, '#8B5CF6'),
  ('Proposal', 3, '#F59E0B'),
  ('Negotiation', 4, '#F97316'),
  ('Closed Won', 5, '#22C55E'),
  ('Closed Lost', 6, '#EF4444');

create table public.hospital_deals (
  id uuid default gen_random_uuid() primary key,
  hospital_id uuid references public.hospitals on delete cascade not null,
  name text not null,
  value numeric(12,2) default 0,
  stage_id uuid references public.hospital_pipeline_stages not null,
  position integer default 0,
  expected_close date,
  assigned_to uuid references public.profiles,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.hospital_activities (
  id uuid default gen_random_uuid() primary key,
  hospital_id uuid references public.hospitals on delete cascade not null,
  action text not null,
  summary text,
  metadata jsonb default '{}',
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create index idx_hospitals_status on public.hospitals(status);
create index idx_hospital_deals_stage on public.hospital_deals(stage_id);
create index idx_hospital_deals_hospital on public.hospital_deals(hospital_id);
create index idx_hospital_activities_hospital on public.hospital_activities(hospital_id);

-- ============================================
-- PROJECTS MODULE
-- ============================================
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'completed', 'on_hold')),
  notion_page_id text,
  deadline date,
  created_by uuid references public.profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.project_members (
  project_id uuid references public.projects on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  role text default 'member',
  primary key (project_id, user_id)
);

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.profiles,
  notion_block_id text,
  due_date date,
  position integer default 0,
  created_at timestamptz default now()
);

create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_status on public.tasks(status);

-- ============================================
-- SOCIAL MEDIA MODULE
-- ============================================
create table public.social_accounts (
  id uuid default gen_random_uuid() primary key,
  platform text not null check (platform in ('facebook', 'instagram', 'tiktok', 'linkedin')),
  account_name text not null,
  access_token text,
  token_expires_at timestamptz,
  created_at timestamptz default now()
);

create table public.social_posts (
  id uuid default gen_random_uuid() primary key,
  content text,
  platforms text[] default '{}',
  media_urls text[] default '{}',
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create table public.ad_campaigns (
  id uuid default gen_random_uuid() primary key,
  platform text not null,
  campaign_id text,
  name text not null,
  status text,
  spend numeric(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  cpc numeric(8,4),
  cpm numeric(8,4),
  date_range daterange,
  synced_at timestamptz default now()
);

-- ============================================
-- INVESTORS MODULE
-- ============================================
create table public.investors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text,
  email text,
  phone text,
  status text default 'pending' check (status in ('active', 'pending', 'cold')),
  investment_amount numeric(14,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.investor_reports (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  pdf_url text,
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create table public.investor_report_recipients (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.investor_reports on delete cascade not null,
  investor_id uuid references public.investors on delete cascade not null,
  tracking_id uuid default gen_random_uuid() unique,
  email_sent boolean default false,
  email_opened boolean default false,
  opened_at timestamptz,
  open_count integer default 0
);

create table public.investor_communications (
  id uuid default gen_random_uuid() primary key,
  investor_id uuid references public.investors on delete cascade not null,
  type text not null check (type in ('email', 'call', 'meeting', 'note')),
  subject text,
  body text,
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create index idx_investors_status on public.investors(status);
create index idx_investor_comms_investor on public.investor_communications(investor_id);

-- ============================================
-- GLOBAL ACTIVITY FEED
-- ============================================
create table public.activity_feed (
  id uuid default gen_random_uuid() primary key,
  module text not null,
  entity_id uuid,
  action text not null,
  summary text,
  metadata jsonb default '{}',
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create index idx_activity_feed_created on public.activity_feed(created_at desc);
create index idx_activity_feed_module on public.activity_feed(module);

-- ============================================
-- ROW LEVEL SECURITY (permissive for single admin)
-- ============================================
alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_activities enable row level security;
alter table public.hospitals enable row level security;
alter table public.hospital_pipeline_stages enable row level security;
alter table public.hospital_deals enable row level security;
alter table public.hospital_activities enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_posts enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.investors enable row level security;
alter table public.investor_reports enable row level security;
alter table public.investor_report_recipients enable row level security;
alter table public.investor_communications enable row level security;
alter table public.activity_feed enable row level security;

-- Simple policy: authenticated users can do everything
-- (Single admin user for now; tighten later for team roles)
create policy "Authenticated users full access" on public.profiles
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.doctors
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.doctor_activities
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.hospitals
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.hospital_pipeline_stages
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.hospital_deals
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.hospital_activities
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.projects
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.project_members
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.tasks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.social_accounts
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.social_posts
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.ad_campaigns
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.investors
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.investor_reports
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.investor_report_recipients
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.investor_communications
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on public.activity_feed
  for all using (auth.role() = 'authenticated');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.doctors
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.hospitals
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.hospital_deals
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.investors
  for each row execute procedure public.update_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
