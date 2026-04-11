-- ============================================================
-- Enterprise Features Migration
-- API Keys, Teams, Webhooks, White-Label Reports
-- ============================================================

-- ── API KEYS ─────────────────────────────────────────────────
CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  scopes text[] DEFAULT '{read}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own API keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked = false;

-- ── TEAMS ────────────────────────────────────────────────────
CREATE TABLE public.teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  invited_email text,
  invite_status text DEFAULT 'pending',
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners and members can view team" ON public.teams FOR SELECT
  USING (owner_id = auth.uid() OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners manage teams" ON public.teams FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Members view team membership" ON public.team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()) OR
         team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()));

CREATE POLICY "Team admins manage members" ON public.team_members FOR ALL
  USING (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()) OR
         team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Add team_id to sites for sharing
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE POLICY "Team members can view team sites" ON public.sites FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- ── WEBHOOKS ─────────────────────────────────────────────────
CREATE TABLE public.webhooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL,
  active boolean DEFAULT true,
  description text,
  last_triggered_at timestamptz,
  failure_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webhooks" ON public.webhooks FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.webhook_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  success boolean,
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deliveries" ON public.webhook_deliveries FOR SELECT
  USING (webhook_id IN (SELECT id FROM public.webhooks WHERE user_id = auth.uid()));
CREATE INDEX idx_webhook_deliveries ON public.webhook_deliveries(webhook_id, attempted_at DESC);

-- ── WHITE-LABEL ──────────────────────────────────────────────
CREATE TABLE public.white_label_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name text NOT NULL DEFAULT '',
  logo_url text,
  primary_color text DEFAULT '#2367a0',
  secondary_color text DEFAULT '#68ccd1',
  footer_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.white_label_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own white label" ON public.white_label_settings FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.report_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  audit_report_id uuid REFERENCES public.audit_reports(id) ON DELETE CASCADE NOT NULL,
  share_token text NOT NULL UNIQUE,
  client_name text,
  expires_at timestamptz,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shares" ON public.report_shares FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_report_shares_token ON public.report_shares(share_token);

-- Admin policies for new tables
CREATE POLICY "Admins view all api_keys" ON public.api_keys FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins view all teams" ON public.teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins view all webhooks" ON public.webhooks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
