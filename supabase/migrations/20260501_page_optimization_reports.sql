-- Per-page keyword optimization reports (Semrush-style On-Page SEO Checker).
-- Stores the AI-generated analysis of a single page vs. its target keyword
-- and the top SERP competitors for that keyword.
CREATE TABLE IF NOT EXISTS public.page_optimization_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  page_url text NOT NULL,
  keyword text NOT NULL,
  secondary_keywords text[],
  optimization_score integer,
  summary text,
  ideas jsonb,       -- categorized ideas: { Content: [...], Semantic: [...], ... }
  competitors jsonb, -- top 10 SERP results snapshot
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.page_optimization_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own page optimization reports" ON public.page_optimization_reports FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_page_opt_reports_site ON public.page_optimization_reports(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_opt_reports_page_kw ON public.page_optimization_reports(site_id, page_url, keyword, created_at DESC);
