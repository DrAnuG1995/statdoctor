-- Prospect overrides: lets users edit prospect fields inline in the CRM.
-- Prospects themselves stay in source code (ProspectsPage.tsx arrays);
-- this table stores any field-level overrides keyed by hospital name.
--
-- At render time the UI merges overrides onto the source-of-truth data,
-- so manual CRM edits win over the hardcoded values.

CREATE TABLE IF NOT EXISTS public.prospect_overrides (
  hospital_name TEXT PRIMARY KEY,
  email         TEXT,
  contact       TEXT,
  role          TEXT,
  location      TEXT,
  type          TEXT,
  notes         TEXT,
  hidden        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT
);

-- If table already existed from an earlier migration, make sure the hidden column is there
ALTER TABLE public.prospect_overrides
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.prospect_overrides ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated users can read (CRM is auth-gated but we keep read permissive).
DROP POLICY IF EXISTS "prospect_overrides_read" ON public.prospect_overrides;
CREATE POLICY "prospect_overrides_read"
  ON public.prospect_overrides
  FOR SELECT
  USING (true);

-- Only authenticated users can write.
DROP POLICY IF EXISTS "prospect_overrides_write_insert" ON public.prospect_overrides;
CREATE POLICY "prospect_overrides_write_insert"
  ON public.prospect_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "prospect_overrides_write_update" ON public.prospect_overrides;
CREATE POLICY "prospect_overrides_write_update"
  ON public.prospect_overrides
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "prospect_overrides_write_delete" ON public.prospect_overrides;
CREATE POLICY "prospect_overrides_write_delete"
  ON public.prospect_overrides
  FOR DELETE
  TO authenticated
  USING (true);
