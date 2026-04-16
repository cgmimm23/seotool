-- Add a full-payload jsonb column so the dashboard AI Visibility page can persist
-- its complete result object (not just the summary fields).
ALTER TABLE public.ai_visibility_reports ADD COLUMN IF NOT EXISTS result jsonb;
