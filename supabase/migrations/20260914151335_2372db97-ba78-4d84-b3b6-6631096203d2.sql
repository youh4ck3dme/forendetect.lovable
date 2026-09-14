ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS forensic_dossier jsonb,
  ADD COLUMN IF NOT EXISTS forensic_dossier_updated_at timestamptz;