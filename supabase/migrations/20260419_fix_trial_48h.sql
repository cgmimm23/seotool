-- Fix trial duration to 48 hours
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, plan, trial_ends_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'starter',
    now() + interval '48 hours'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
