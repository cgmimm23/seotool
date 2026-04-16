ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS bing_api_key text;
