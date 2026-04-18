-- Add site_type so SEO audits can tailor recommendations to the business type.
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS site_type text;
