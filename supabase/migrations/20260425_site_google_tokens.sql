-- Per-site Google OAuth tokens so each website can connect its own Google
-- account for Analytics, Search Console, Ads, etc.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS google_email text,
  ADD COLUMN IF NOT EXISTS google_access_token text,
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS gsc_site_url text;
