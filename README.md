# Marketing Machine SEO — Setup Guide

## 1. Clone & Install

```bash
git clone https://github.com/cgmimm23/seotool.git
cd seotool
npm install
```

## 2. Environment Variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fasfqnetbcfagmfknclw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ApfQ0wR3Cf-RD0Xjhown9w_NwAqTEyd
ANTHROPIC_API_KEY=your-anthropic-key-here
SERPAPI_KEY=your-serpapi-key-here
CRON_SECRET=pick-any-random-string
SUPABASE_SERVICE_ROLE_KEY=get-from-supabase-settings-api
```

> Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Settings → API → service_role (keep this secret, never commit it)

## 3. Set Up Database

1. Go to **Supabase → SQL Editor → New Query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**

## 4. Enable Google Auth in Supabase

1. Go to **Supabase → Authentication → Providers → Google**
2. Enable it
3. Add your Google OAuth credentials (create at console.cloud.google.com)
4. Add redirect URL: `https://yourdomain.com/auth/callback`

## 5. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

## 6. Deploy to DigitalOcean

1. Push all files to GitHub:
```bash
git add .
git commit -m "Initial setup"
git push origin main
```

2. Go to **DigitalOcean → App Platform → Create App**
3. Connect your GitHub repo `cgmimm23/seotool`
4. Select branch: `main`
5. Add all environment variables from `.env.local`
6. Set build command: `npm run build`
7. Set run command: `npm start`
8. Deploy

## 7. Set Up Auto-Scan Cron Job (DigitalOcean)

Once deployed, set up a cron job to hit your `/api/cron` endpoint:

- In DigitalOcean App Platform → your app → **Jobs** → Create Job
- Command: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron`
- Schedule: `0 * * * *` (every hour — it checks plan tiers internally)

## Project Structure

```
app/
  api/
    audit/route.ts      ← runs SEO audit, saves to DB
    serp/route.ts       ← fetches live SERP data via SerpAPI
    keywords/route.ts   ← keyword management + AI analysis
    cron/route.ts       ← auto-scan job (called by scheduler)
  login/page.tsx        ← auth page (Google + email)
  auth/callback/route.ts
  dashboard/            ← main dashboard (build next)
lib/
  supabase.ts           ← browser client
  supabase-server.ts    ← server client
  anthropic.ts          ← AI audit + keyword analysis
  serpapi.ts            ← SerpAPI wrapper
  scheduler.ts          ← plan-based scan timing
supabase/
  schema.sql            ← full DB schema, run this first
middleware.ts           ← auth protection on all routes
```

## API Keys Needed

| Key | Where to get |
|-----|-------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `SERPAPI_KEY` | serpapi.com/manage-api-key (rotate your exposed key!) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| Google OAuth | console.cloud.google.com → Credentials |
