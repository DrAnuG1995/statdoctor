-- Add new doctor fields from admin portal
alter table public.doctors add column if not exists medical_degree text;
alter table public.doctors add column if not exists skill_level text;
alter table public.doctors add column if not exists specialities text[] default '{}';
alter table public.doctors add column if not exists ahpra_number text;
alter table public.doctors add column if not exists ahpra_restrictions boolean default false;
alter table public.doctors add column if not exists has_references boolean default false;
alter table public.doctors add column if not exists has_documents boolean default false;
alter table public.doctors add column if not exists registered_date date;
