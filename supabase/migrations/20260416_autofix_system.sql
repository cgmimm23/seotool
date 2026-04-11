-- Auto-fix system: stores AI-generated fix instructions and tracks their status
CREATE TABLE public.fix_instructions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  audit_id uuid REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  fix_type text NOT NULL,
  priority text DEFAULT 'medium',
  target jsonb NOT NULL DEFAULT '{}',
  current_value text,
  suggested_value text,
  status text DEFAULT 'pending',
  applied_by text,
  applied_at timestamptz,
  plugin_version text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fix_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own fixes" ON public.fix_instructions FOR SELECT
  USING (site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid()));

CREATE INDEX idx_fix_instructions_site ON public.fix_instructions(site_id, status, created_at DESC);
