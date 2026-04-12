-- Add password reset tokens for admin accounts
ALTER TABLE public.admin_accounts
  ADD COLUMN IF NOT EXISTS reset_token text,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamptz;
