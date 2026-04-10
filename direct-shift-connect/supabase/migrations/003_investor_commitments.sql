-- Add commitment_amount column for tracking verbal commitments vs actual deposits
ALTER TABLE public.investors ADD COLUMN IF NOT EXISTS commitment_amount numeric(14,2);
ALTER TABLE public.investors ADD COLUMN IF NOT EXISTS commitment_notes text;
