# ShadowGrid AI — Local Setup & Deployment Guide

## Quick Start (Local)

```bash
# 1. Clone & install
git clone <repo_url> shadowgrid-ai
cd shadowgrid-ai
pnpm install

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Start the dev server
pnpm dev
```

The app runs in **mock mode** with no env vars set — all seeded data is available immediately.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Optional | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase anon/public key |
| `VITE_NEWS_API_KEY` | Optional | [newsapi.org](https://newsapi.org) free key |
| `VITE_NEWS_API_PROXY_URL` | Optional | Proxy endpoint for NewsAPI (needed for browser deploys) |
| `VITE_OPEN_METEO_BASE_URL` | Optional | Defaults to `https://api.open-meteo.com/v1` |
| `VITE_DEMO_CITY` | Optional | City name for Open-Meteo / NewsAPI queries (default: `Metroville`) |
| `VITE_APP_ID` | Optional | Application identifier (default: `shadowgrid-ai`) |

### Data Modes

| Mode | Condition | Behaviour |
|---|---|---|
| **mock** | No Supabase URL set | Uses seeded in-memory data only |
| **hybrid** | Supabase URL set, no News API key | Supabase persistence + Open-Meteo weather only |
| **live** | Supabase URL + News API key both set | Full Supabase + Open-Meteo + NewsAPI ingestion |

---

## Supabase Setup

### 1. Create a Supabase project
- Go to [app.supabase.com](https://app.supabase.com) → New project
- Copy **Project URL** and **anon public key** into `.env`

### 2. Apply the schema migration
```sql
-- Run in Supabase SQL Editor:
-- Copy & paste contents of: supabase/migrations/00001_create_shadowgrid_schema.sql
```

### 3. Seed the database
```sql
-- Run in Supabase SQL Editor:
-- Copy & paste contents of: supabase/seed.sql
```

### 4. Verify tables
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: citizen_reports, external_signals, failure_chains, 
--           recommendations, risk_scores, team_allocations, zones
```

---

## Required vs Optional Tables

| Table | MVP Status | Notes |
|---|---|---|
| `zones` | **Required** | Engine cannot run without at least 1 zone |
| `citizen_reports` | **Required** | Drives citizen_component in risk scoring |
| `external_signals` | **Required** | Drives weather/signal components |
| `risk_scores` | Optional | Generated in-memory; stored for analytics history |
| `recommendations` | Optional | Generated in-memory; stored for audit trail |
| `failure_chains` | Optional | Generated in-memory; stored for history |
| `team_allocations` | Optional | Generated in-memory; stored for deployment tracking |

---

## Vercel Deployment

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard:
# Project → Settings → Environment Variables
# Add: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, (optional) VITE_NEWS_API_KEY
```

### NewsAPI Browser CORS Issue

NewsAPI free tier blocks direct browser requests. For production Vercel deploys:

**Option A: Vercel API route** (recommended for quick deploys)
```
/api/news-proxy.ts
```
```typescript
// api/news-proxy.ts
export default async function handler(req, res) {
  const { q, pageSize = 10 } = req.query;
  const url = `https://newsapi.org/v2/everything?q=${q}&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;
  const data = await fetch(url).then(r => r.json());
  res.json(data);
}
```
Set `VITE_NEWS_API_PROXY_URL=/api/news-proxy` in Vercel env vars.

**Option B: Supabase Edge Function** (if you want server-side execution)
- Create an edge function that proxies NewsAPI requests server-side.

---

## Open-Meteo

- Free, no API key required
- Works directly from the browser (CORS-friendly)
- Rate limits: generous for MVP usage (no hard limit on free tier)
- The app fetches weather per zone using zone lat/lng coordinates

---

## Adding Scheduled Ingestion (Post-MVP)

To add automated signal ingestion, create a Supabase Edge Function:

```typescript
// supabase/functions/scheduled-ingest/index.ts
// Trigger: Supabase Cron (pg_cron) every 30 minutes
// Action: Call ingestExternalSignals(), persist results
```

Alternatively, use a Vercel cron job (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/ingest",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

---

## Development Notes

- `pnpm dev` — starts Vite dev server on http://localhost:5173
- `pnpm build` — production build to `./dist`
- `pnpm preview` — preview the production build locally
- `pnpm lint` — TypeScript type check (tsgo) + Biome lint
- `pnpm lint:ci` — full lint pipeline (Linux/CI only, includes ast-grep + tailwind checks)
- The app works fully offline in mock mode — no internet required for demos
