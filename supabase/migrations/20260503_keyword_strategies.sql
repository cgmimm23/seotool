-- Keyword strategy reports: core phrases + long-tail clusters + deployment strategy
-- for a site. Think Semrush + a topic cluster planner.
CREATE TABLE IF NOT EXISTS public.keyword_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  summary text,
  core_phrases jsonb,          -- array of core-phrase objects
  long_tail_clusters jsonb,    -- array of cluster objects (each with phrases array)
  deployment_strategy jsonb,   -- structured deployment plan (pillars, clusters, tags, etc.)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.keyword_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keyword strategies" ON public.keyword_strategies FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_keyword_strategies_site ON public.keyword_strategies(site_id, created_at DESC);
