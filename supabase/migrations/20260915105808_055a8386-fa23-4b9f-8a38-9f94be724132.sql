ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_task_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_task_check CHECK (task IN (
  'explain_finding', 'normalize_descriptions', 'short_summary', 'document_classification',
  'case_summary', 'forensic_autopilot', 'contradiction_analysis', 'temporal_analysis',
  'financial_flow_analysis', 'report_assistance', 'alt_devil', 'admiss_audit', 'ocr_extraction',
  'csv_column_mapping'
));