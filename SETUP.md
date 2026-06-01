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

Env vars describe which **backends are available** — they do not select the data mode. The Demo/Live mode is chosen at runtime in the UI and persisted in `localStorage`.

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Optional | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase anon/public key |
| `VITE_NEWS_API_KEY` | Optional | [newsapi.org](https://newsapi.org) free key (enables live news ingestion) |
| `VITE_NEWS_API_PROXY_URL` | Optional | Proxy endpoint for NewsAPI (needed for browser deploys) |
| `VITE_OPEN_METEO_BASE_URL` | Optional | Defaults to `https://api.open-meteo.com/v1` |
| `VITE_DEMO_CITY` | Optional | City name for live weather / news queries (default: `Metroville`) |

### Data Modes (runtime-selectable)

The app starts in **Demo** mode and exposes a Demo/Live switcher in the sidebar and Operations Center. Both datasets live in the database, separated by a `dataset_type` column.

| Mode | Source | Behaviour |
|---|---|---|
| **demo** (default) | `dataset_type='demo'` rows | Stable seeded dataset. Presentation-safe and immutable from the browser (RLS). Falls back to in-memory seed if Supabase is unconfigured. |
| **live** | `dataset_type='live'` rows | Real ingested dataset. Weather (Open-Meteo) + news (NewsAPI) are normalised, stored as live rows, and scored. Starts empty, grows per ingest. |

**How switching works**
- Selection persists in `localStorage` (`shadowgrid.dataMode`); refresh keeps it.
- Switching clears state and reloads the chosen dataset from the DB, then re-runs the engine.
- *Reset to Demo* clears the saved preference; *Clear Live Dataset* wipes all `live` rows.
- Ingestion runs in Live mode only and never modifies Demo rows.

---

## Supabase Setup

### 1. Create a Supabase project
- Go to [app.supabase.com](https://app.supabase.com) → New project
- Copy **Project URL** and **anon public key** into `.env`

### 2. Apply the schema migrations
```sql
-- Run in Supabase SQL Editor, in order:
-- 1. supabase/migrations/00001_create_shadowgrid_schema.sql  (tables + dataset_type + read/insert policies)
-- 2. supabase/migrations/00002_add_dataset_type.sql          (idempotent; no-op on a fresh 00001)
-- 3. supabase/migrations/00003_live_delete_policies.sql      (live-only insert/update/delete RLS)
-- 4. supabase/migrations/00004_zones_dataset_type.sql        (dataset_type on zones + live zone RLS)
```

### 3. Seed the database
```sql
-- Run in Supabase SQL Editor:
-- Copy & paste contents of: supabase/seed.sql
-- All seeded rows are tagged dataset_type='demo'. The live dataset starts empty.
```

### 4. Verify tables
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: citizen_reports, external_signals, failure_chains, 
--           recommendations, risk_scores, team_allocations, zones

-- Confirm dataset separation:
SELECT dataset_type, count(*) FROM risk_scores GROUP BY dataset_type;
-- Expected after seeding: demo | 13
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

NewsAPI free tier blocks direct browser requests on public domains. (Not an issue on `localhost` or in Demo mode.) For production browser deploys, route requests through a server-side proxy.

**Option A: Supabase Edge Function** (recommended — works regardless of where the frontend is hosted)

This repo includes the function at `supabase/functions/news-proxy/index.ts`. It is already deployed to this project. To deploy/update it yourself and configure the key:

```bash
# 1. Deploy the function
supabase functions deploy news-proxy

# 2. Set the NewsAPI key as a server-side secret (NEVER shipped to the browser)
supabase secrets set NEWS_API_KEY=your-newsapi-key
```

Then point the app at it:
```
VITE_NEWS_API_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/news-proxy
```

How it works:
- The browser calls the function with the Supabase **anon key** in the `Authorization` header (handled automatically by `newsService.ts`).
- The function reads `NEWS_API_KEY` from its secret, calls newsapi.org server-side, and returns the JSON with permissive CORS headers.
- The NewsAPI key never leaves the server. Do **not** set `VITE_NEWS_API_KEY` in production browser builds when using the proxy.

> ⚠️ Setting the `NEWS_API_KEY` secret requires the Supabase CLI (or Dashboard → Edge Functions → Manage secrets) — it can't be done from the app. Until the secret is set, the function returns a clear "NEWS_API_KEY secret not configured" error and the app falls back to seeded news signals.

**Option B: Vercel API route** (if hosting on Vercel)
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
Set `NEWS_API_KEY` (server-side) and `VITE_NEWS_API_PROXY_URL=/api/news-proxy` in Vercel env vars.

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
- The app works fully offline in Demo mode — no internet required for demos

---

## Testing Both Modes Locally

1. **Start the app** — `pnpm dev`, open http://localhost:5173. It loads in **Demo** mode by default (yellow badge in the sidebar/header).
2. **Confirm Demo data** — Dashboard shows 7 Metroville zones with seeded risk scores. This data is read from `dataset_type='demo'` rows (or in-memory seed if Supabase is not configured).
3. **Switch to Live** — Use the Demo/Live toggle in the sidebar, or open **Operations → Data Mode** and click **Live**. The badge turns green and the app reloads from `dataset_type='live'` rows (empty on first run).
4. **Ingest live data** — In Operations, click **Ingest Signals**. This fetches Open-Meteo weather (and NewsAPI news if `VITE_NEWS_API_KEY` is set), normalises them into `live` signals, stores them, re-runs scoring, and persists the live risk scores / recommendations / chains / allocations. The *Last Ingest* panel shows source (`live` vs `fallback`) and counts.
5. **Verify separation** — Switch back to **Demo**: the seeded data is unchanged and stable. Switch to **Live**: your ingested data persists. Refresh the page — your selected mode is remembered.
6. **Reset** — *Reset to Demo* returns to the default mode; *Clear Live Dataset* (Live mode) wipes all live rows from the DB.

> Demo mode is the safe presentation default. Live ingestion can never modify Demo rows — this is enforced by row-level security (browser may only write `dataset_type='live'`).
