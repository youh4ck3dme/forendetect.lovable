ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS fallback boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS request_id uuid;

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_task_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_task_check CHECK (task IN (
  'explain_finding', 'normalize_descriptions', 'short_summary', 'document_classification',
  'case_summary', 'forensic_autopilot', 'contradiction_analysis', 'temporal_analysis',
  'financial_flow_analysis', 'report_assistance', 'alt_devil', 'admiss_audit', 'ocr_extraction'
));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_mode_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_mode_check CHECK (mode IS NULL OR mode IN ('fast', 'reasoning'));

CREATE INDEX IF NOT EXISTS ai_usage_request_id_idx ON public.ai_usage (request_id);