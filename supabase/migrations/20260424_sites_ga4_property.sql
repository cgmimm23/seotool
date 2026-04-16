ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS ga4_property_id text;
