-- Free-form notes the user writes about the site. These are injected into
-- every audit prompt so the AI knows about site-specific context (e.g.,
-- "our sitemap is at /sitemap.xml", "ignore performance — we score 100").
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS audit_notes text;
