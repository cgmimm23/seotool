-- Backlinks the user wants to disavow (tell Google/Bing to ignore for ranking)
CREATE TABLE IF NOT EXISTS public.disavowed_backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('domain', 'url')),
  target text NOT NULL,
  reason text,
  synced_to_bing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (site_id, scope, target)
);

CREATE INDEX IF NOT EXISTS disavowed_backlinks_site_idx ON public.disavowed_backlinks(site_id);

ALTER TABLE public.disavowed_backlinks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage their disavows" ON public.disavowed_backlinks;
CREATE POLICY "users manage their disavows" ON public.disavowed_backlinks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
