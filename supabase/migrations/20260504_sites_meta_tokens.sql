-- Per-site Meta (Facebook/Instagram/Ads) OAuth tokens. Long-lived user token +
-- derived Page and IG Business account identifiers + selected Ad account.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS meta_user_id text,
  ADD COLUMN IF NOT EXISTS meta_user_name text,
  ADD COLUMN IF NOT EXISTS meta_user_access_token text,
  ADD COLUMN IF NOT EXISTS meta_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_page_id text,
  ADD COLUMN IF NOT EXISTS meta_page_name text,
  ADD COLUMN IF NOT EXISTS meta_page_access_token text,
  ADD COLUMN IF NOT EXISTS meta_ig_user_id text,
  ADD COLUMN IF NOT EXISTS meta_ig_username text,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
  ADD COLUMN IF NOT EXISTS meta_scopes text;
