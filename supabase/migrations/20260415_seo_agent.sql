-- AI SEO Agent tables

CREATE TABLE public.agent_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  page_url text NOT NULL,
  page_title text,
  issues_found jsonb NOT NULL DEFAULT '[]',
  fixes_applied jsonb NOT NULL DEFAULT '[]',
  meta_snapshot jsonb,
  visitor_ua text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own agent reports" ON public.agent_reports FOR SELECT
  USING (site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid()));

CREATE INDEX idx_agent_reports_site ON public.agent_reports(site_id, created_at DESC);
CREATE INDEX idx_agent_reports_page ON public.agent_reports(site_id, page_url);

CREATE TABLE public.agent_alt_text_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  alt_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, image_url)
);

ALTER TABLE public.agent_alt_text_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS agent_enabled boolean DEFAULT false;

-- Admin policies
CREATE POLICY "Admins view all agent reports" ON public.agent_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
