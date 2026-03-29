-- ============================================================
-- Marketing Machine SEO — Supabase Schema
-- Run this in Supabase SQL Editor (Database > SQL Editor > New query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
-- Extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free', -- free | starter | pro | agency
  serp_api_key text,
  anthropic_api_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SITES ─────────────────────────────────────────────────
create table public.sites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  name text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.sites enable row level security;

create policy "Users manage own sites"
  on public.sites for all
  using (auth.uid() = user_id);

-- ── AUDIT REPORTS ─────────────────────────────────────────
create table public.audit_reports (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  overall_score integer,
  grade text,
  summary text,
  categories jsonb,   -- { Technical: 80, Content: 65, ... }
  checks jsonb,       -- [ { status, category, title, detail }, ... ]
  created_at timestamptz default now()
);

alter table public.audit_reports enable row level security;

create policy "Users view own reports"
  on public.audit_reports for all
  using (auth.uid() = user_id);

create index on public.audit_reports(site_id, created_at desc);

-- ── KEYWORDS ──────────────────────────────────────────────
create table public.keywords (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  page_path text not null,       -- e.g. "/" or "/pricing"
  keyword text not null,
  target_position integer,
  created_at timestamptz default now(),
  unique(site_id, page_path, keyword)
);

alter table public.keywords enable row level security;

create policy "Users manage own keywords"
  on public.keywords for all
  using (auth.uid() = user_id);

-- ── SERP RANKINGS ─────────────────────────────────────────
create table public.serp_rankings (
  id uuid default uuid_generate_v4() primary key,
  keyword_id uuid references public.keywords(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  position integer,
  previous_position integer,
  results jsonb,      -- full SERP snapshot
  checked_at timestamptz default now()
);

alter table public.serp_rankings enable row level security;

create policy "Users view own rankings"
  on public.serp_rankings for all
  using (auth.uid() = user_id);

create index on public.serp_rankings(keyword_id, checked_at desc);

-- ── KEYWORD ANALYSES ──────────────────────────────────────
create table public.keyword_analyses (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  page_path text not null,
  keywords text[],
  score integer,
  verdict text,
  fixes jsonb,        -- [ { priority, title, action }, ... ]
  created_at timestamptz default now()
);

alter table public.keyword_analyses enable row level security;

create policy "Users view own analyses"
  on public.keyword_analyses for all
  using (auth.uid() = user_id);

-- ── PLAN SCAN LIMITS ──────────────────────────────────────
-- Tracks when each site was last auto-scanned
create table public.scan_schedule (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete cascade not null unique,
  user_id uuid references public.profiles(id) on delete cascade not null,
  last_scanned_at timestamptz,
  next_scan_at timestamptz,
  plan text default 'free'
);

alter table public.scan_schedule enable row level security;

create policy "Users view own schedule"
  on public.scan_schedule for all
  using (auth.uid() = user_id);
