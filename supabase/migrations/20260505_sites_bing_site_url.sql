-- Persist the selected Bing Webmaster site URL per site
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS bing_site_url text;
