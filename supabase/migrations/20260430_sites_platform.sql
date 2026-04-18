-- Platform the site is built on (WordPress, Wix, Shopify, etc.) — used to
-- tailor audit fix instructions to the platform's specific interface.
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS platform text;
