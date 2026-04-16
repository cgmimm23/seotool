-- Persist Page Speed and AI Visibility reports so they survive page refresh

CREATE TABLE IF NOT EXISTS public.pagespeed_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  mobile_data jsonb,
  desktop_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pagespeed_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pagespeed reports" ON public.pagespeed_reports FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pagespeed_reports_user_url ON public.pagespeed_reports(user_id, url, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pagespeed_reports_site ON public.pagespeed_reports(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_visibility_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_visibility_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai visibility reports" ON public.ai_visibility_reports FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_visibility_reports_user_url ON public.ai_visibility_reports(user_id, url, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_reports_site ON public.ai_visibility_reports(site_id, created_at DESC);
