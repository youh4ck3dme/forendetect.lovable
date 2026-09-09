-- ════════════════════════════════════════════════════════════════
-- FORENZNÝ AUTOPILOT — Zero-migration
-- Jediný JSONB stĺpec v existujúcej tabuľke cases.
-- ════════════════════════════════════════════════════════════════

-- 1. Pridaj JSONB stĺpec (ak ešte neexistuje)
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS forensic_dossier JSONB DEFAULT NULL;

-- 2. Timestamp poslednej analýzy
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS forensic_dossier_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 3. GIN index pre rýchle queryovanie vnútri JSONB
CREATE INDEX IF NOT EXISTS idx_cases_forensic_dossier_gin
  ON public.cases USING GIN (forensic_dossier);
