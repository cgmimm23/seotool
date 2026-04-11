-- In-app notifications
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- Broadcast messages (user_id NULL = sent to everyone)
-- Email broadcast log
CREATE TABLE public.email_broadcasts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  recipient_filter text DEFAULT 'all',
  recipient_count integer DEFAULT 0,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;
