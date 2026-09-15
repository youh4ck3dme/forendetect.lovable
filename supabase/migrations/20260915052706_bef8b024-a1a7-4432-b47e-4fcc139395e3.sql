CREATE TABLE public.agent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  leads_count integer NOT NULL DEFAULT 0,
  ai_status text NOT NULL DEFAULT 'skipped',
  error_detail text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  lead_type text NOT NULL,
  fingerprint text NOT NULL,
  title text NOT NULL,
  reason text NOT NULL DEFAULT '',
  base_score numeric NOT NULL DEFAULT 0.5,
  refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_explanation text,
  ai_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'new',
  note text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (case_id, fingerprint)
);

CREATE TABLE public.agent_type_feedback (
  user_id uuid NOT NULL,
  lead_type text NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0,
  follow_count integer NOT NULL DEFAULT 0,
  snooze_count integer NOT NULL DEFAULT 0,
  dismiss_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lead_type)
);

CREATE INDEX agent_leads_case_idx ON public.agent_leads (case_id, decision);
CREATE INDEX agent_runs_case_idx ON public.agent_runs (case_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_type_feedback TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
GRANT ALL ON public.agent_leads TO service_role;
GRANT ALL ON public.agent_type_feedback TO service_role;

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_type_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent runs" ON public.agent_runs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own agent leads" ON public.agent_leads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own agent feedback" ON public.agent_type_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON public.agent_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_leads_updated_at BEFORE UPDATE ON public.agent_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_feedback_updated_at BEFORE UPDATE ON public.agent_type_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();