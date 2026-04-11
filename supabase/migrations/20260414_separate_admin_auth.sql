-- Completely separate admin accounts table
-- No connection to auth.users or profiles
CREATE TABLE public.admin_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- No RLS policies — only accessed via service role key server-side
