# ShadowGrid AI 🛡️
### Predictive Smart City Failure Intelligence Platform

[![Hackathon MVP](https://img.shields.io/badge/Hackathon-MVP-blueviolet)](#)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](#)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)](#)

---

## Problem Statement

Urban infrastructure fails silently. A blocked drain escalates to a flood. A power dip becomes a blackout. A road crack causes an accident. By the time alerts reach city operators, the cascade has already started.

**Cities react to failures. ShadowGrid predicts them.**

Current smart city tools are fragmented — weather dashboards, 311 apps, and sensor feeds exist in silos. No platform fuses these signals into a unified, ranked, explainable risk picture that tells operators *which zone to fix first, why, and how*.

---

## Solution

ShadowGrid AI is a real-time infrastructure risk intelligence platform for city operators. It:

1. **Ingests** citizen reports, Open-Meteo weather data, and NewsAPI news signals
2. **Scores** each city zone across 6 failure categories using a deterministic weighted formula
3. **Simulates** cascading failure chains (e.g. rainfall → drain overflow → road blocked → ambulance delayed)
4. **Recommends** ranked preventive interventions for maintenance teams
5. **Visualises** everything on an interactive Leaflet map with zone drill-down

All risk scores are fully explainable — no black box.

---

## Features

| Feature | Description |
|---|---|
| 🗺 **Interactive Risk Map** | Leaflet choropleth with 7 category filter modes and zone drill-down side panel |
| 📊 **Risk Scoring Engine** | Weighted formula: Citizen (30%) + Weather (25%) + Signals (20%) + Historical (15%) + Propagation (10%) |
| ⛓ **Failure Chain Simulator** | Cascading infrastructure failure modelling with per-step probability |
| 🎯 **Preventive Recommender** | Ranked, urgency-tiered action items per zone and category |
| 📡 **Civic Pulse Scanner** | Fuses weather alerts, news signals, and citizen reports |
| 📈 **Analytics Dashboard** | Trend charts, zone comparisons, signal counts, category distributions |
| 📝 **Citizen Report Form** | Real-time submission that re-triggers the risk engine instantly |
| 🔧 **Operations Center** | Team allocation planner, signal inspector, and ingestion control panel |
| 🌓 **Two Runtime Data Modes** | Demo (stable DB-backed seed) and Live (real ingested, DB-backed) — switchable at runtime |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Map | Leaflet |
| State | React Context + custom hooks |
| Charts | Recharts |
| Database | Supabase (Postgres + Edge Functions) |
| Weather API | Open-Meteo (free, no key required) |
| News API | NewsAPI (free tier, optional) |
| AI Layer | Google Gemini 2.5 Flash-Lite via Supabase Edge Functions |
| Hosting | Vercel (recommended) |
| UI prototyping / design support | MeDo AI |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  ShadowGrid AI — Data Flow                               │
│                                                          │
│  External Sources          Engine Modules               │
│  ┌──────────────┐          ┌────────────────────────┐   │
│  │ Open-Meteo   │──────┐   │ 1. Signal Clustering   │   │
│  │ (weather)    │      │   │ 2. Risk Scoring        │   │
│  └──────────────┘      ├──▶│ 3. Zone Graph Prop.    │   │
│  ┌──────────────┐      │   │ 4. Time Decay          │   │
│  │ NewsAPI      │──────┤   │ 5. Failure Chains      │   │
│  │ (signals)    │      │   │ 6. Recommender         │   │
│  └──────────────┘      │   │ 7. Team Allocator      │   │
│  ┌──────────────┐      │   │ 8. Explainer           │   │
│  │ Citizen      │──────┘   └───────────┬────────────┘   │
│  │ Reports      │                      │                 │
│  └──────────────┘                      ▼                 │
│                              ┌─────────────────┐         │
│                              │  AppContext      │         │
│                              │  (reactive store)│         │
│                              └────────┬────────┘         │
│                                       │                  │
│  ┌────────────────────────────────────▼───────────────┐  │
│  │  UI Pages                                          │  │
│  │  Landing · Dashboard · Risk Map · Analytics        │  │
│  │  Zone Details · Report · Operations                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Persistence: Supabase Postgres (optional, graceful     │
│  fallback to seeded demo data when not configured)      │
└──────────────────────────────────────────────────────────┘
```

---

## Data Modes

ShadowGrid has two runtime data modes, both backed by the database and switchable from the UI (sidebar or Operations Center) without restarting or changing env vars. The choice is saved in `localStorage`, and the app always starts in Demo mode.

| Mode | Source | Behaviour |
|---|---|---|
| **Demo** (default) | `dataset_type='demo'` rows in the DB | Stable, deterministic, presentation-safe. Immutable from the browser (RLS-protected). Works even if external APIs are offline. |
| **Live** | `dataset_type='live'` rows in the DB | Real ingested data. Open-Meteo weather + NewsAPI news are normalised, stored as live rows, and scored over time. Grows with each ingest. |

Dataset separation is enforced at the database level: every dynamic table carries a `dataset_type` column, and row-level security only permits the browser to write `live` rows — so Demo data can never be mutated or overwritten by ingestion.

When Supabase is not configured, Demo mode falls back to in-memory seeded constants so the app still runs fully offline; Live mode shows whatever live rows exist (empty until ingested).

---

## AI Features (Google Gemini)

Two optional AI layers run on **Google Gemini 2.5 Flash-Lite**, routed through **Supabase Edge Functions** so the Gemini key never reaches the browser.

| Feature | Function | What it does |
|---|---|---|
| **LLM Explanation Layer** | `llm-explain` | Turns a zone's structured risk data (scores, signals, reports, propagation) into a concise plain-language explanation + recommended first action. Shown on the Zone Details page via an on-demand **Explain with AI** button. |
| **NLP News Classifier** | `news-classify` | Classifies ingested news articles into risk categories (flooding, power, road, water, traffic) with confidence — beyond keyword matching. Runs automatically during live news ingestion. |

### Setup

```bash
# Deploy the Edge Functions
supabase functions deploy llm-explain
supabase functions deploy news-classify

# Set the Gemini key as a server-side secret (shared by both functions)
supabase secrets set GEMINI_API_KEY=your-gemini-key
```

Get a free key at [aistudio.google.com](https://aistudio.google.com/apikey). The client auto-discovers the functions at `<VITE_SUPABASE_URL>/functions/v1`; override with `VITE_SUPABASE_FUNCTIONS_URL` if needed, or disable everything with `VITE_AI_ENABLED=false`.

Both layers degrade gracefully: if AI is disabled or a call fails, the app falls back to the deterministic engine explanation and keyword-based news matching.

---

## Screenshots

| Dashboard | Risk Map | Zone Details |
|---|---|---|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

---

## Demo

> 🔗 **Live Demo**: _(add Vercel URL after deployment)_

The demo runs in **Demo mode** — no API keys required. All 7 city zones of the fictional city of **Metroville** are pre-seeded with realistic risk data. Flip to **Live mode** from the sidebar or Operations Center to ingest and store real weather/news signals.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-username/shadowgrid-ai.git
cd shadowgrid-ai

# 2. Install dependencies
pnpm install

# 3. Copy env template
cp .env.example .env

# 4. Start development server
pnpm dev
# → http://localhost:5173
```

The app runs in **Demo mode** with no `.env` changes needed.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values you want. Env vars do not select the data mode — they only describe which backends are available. The Demo/Live mode is chosen at runtime in the UI.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Optional | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | — | Supabase anon/public key |
| `VITE_NEWS_API_KEY` | Optional | — | [newsapi.org](https://newsapi.org) free key — local dev only, do not set in production |
| `VITE_NEWS_API_PROXY_URL` | Optional | — | Proxy URL for NewsAPI (avoids browser CORS on public domains) |
| `VITE_OPEN_METEO_BASE_URL` | Optional | `https://api.open-meteo.com/v1` | Override for tests/CI |
| `VITE_SUPABASE_FUNCTIONS_URL` | Optional | `<VITE_SUPABASE_URL>/functions/v1` | Override Edge Functions base URL |
| `VITE_AI_ENABLED` | Optional | `true` | Set to `false` to disable all AI features |
| `VITE_LIVE_CITY` | Optional | `London` | City for Live mode (external queries + map center) |

> ⚠️ **Never commit `.env`** — it is in `.gitignore`.

---

## Supabase Setup

### 1. Create a project

Go to [app.supabase.com](https://app.supabase.com) → **New Project**. Copy the **Project URL** and **anon public key** into `.env`.

### 2. Apply schema migrations

Open the **SQL Editor** in your Supabase project and run, in order:

```
supabase/migrations/00001_create_shadowgrid_schema.sql   -- tables + dataset_type + read/insert policies
supabase/migrations/00002_add_dataset_type.sql           -- idempotent guard (no-op on a fresh 00001)
supabase/migrations/00003_live_delete_policies.sql       -- live-only insert/update/delete RLS
supabase/migrations/00004_zones_dataset_type.sql         -- dataset_type on zones table + live zone RLS
```

### 3. Seed the database

Run the full contents of `supabase/seed.sql`.

### 4. Verify

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: citizen_reports, external_signals, failure_chains,
--           recommendations, risk_scores, team_allocations, zones
```

---

## NewsAPI Setup (Optional)

Register for a free key at [newsapi.org](https://newsapi.org).

**Local development** — add `VITE_NEWS_API_KEY=your_key` to `.env`. NewsAPI allows direct browser requests from `localhost`.

**Production** — NewsAPI's free tier blocks direct browser requests on public domains, and a `VITE_`-prefixed key is bundled into the client. Do not set `VITE_NEWS_API_KEY` in production. Route through a server-side proxy instead:

- **Supabase Edge Function** (recommended): deploy `supabase/functions/news-proxy`, set the `NEWS_API_KEY` secret, then set `VITE_NEWS_API_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/news-proxy`
- **Vercel API route**: set `NEWS_API_KEY` (server-side, no `VITE_` prefix) and `VITE_NEWS_API_PROXY_URL=/api/news-proxy`

If neither a key nor a proxy is configured, the app falls back to seeded news signals — Demo mode still works.

---

## Local Development

```bash
pnpm dev          # Start dev server → http://localhost:5173
pnpm build        # Production build → ./dist
pnpm preview      # Preview production build locally
pnpm lint         # TypeScript type check + Biome lint
```

No internet connection required in Demo mode.

---

## Deployment (Vercel)

### Option A — Vercel CLI

```bash
pnpm add -g vercel
vercel
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_NEWS_API_PROXY_URL   # → your Supabase Edge Function URL
```

### Option B — Vercel Dashboard

1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Vite** (auto-detected)
3. Build command: `pnpm build`
4. Output directory: `dist`
5. Add env vars under **Settings → Environment Variables**

> Do **not** add `VITE_NEWS_API_KEY` to a public deploy — it would be exposed in the client bundle.

### Live News in Production (CORS-safe)

```bash
supabase functions deploy news-proxy
supabase secrets set NEWS_API_KEY=your-newsapi-key
```

Then set on the frontend host:
```
VITE_NEWS_API_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/news-proxy
```

---

## Deployment Checklist

### Local run
- [ ] `pnpm install` succeeds
- [ ] `cp .env.example .env`
- [ ] `pnpm dev` — app loads at localhost:5173
- [ ] Dashboard shows 7 zones in Demo mode
- [ ] Risk map loads and zones are clickable
- [ ] Citizen report form submits and map updates

### Supabase setup
- [ ] Project created at app.supabase.com
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` added to `.env`
- [ ] Schema migrations applied via SQL editor
- [ ] Seed SQL applied via SQL editor
- [ ] App reloads — sidebar shows the Demo / Live switcher

### Vercel deployment
- [ ] Repo pushed to GitHub
- [ ] Project imported at vercel.com/new
- [ ] Env vars added in Vercel dashboard
- [ ] `VITE_NEWS_API_KEY` is **not** set in production
- [ ] Live news routed via proxy: `VITE_NEWS_API_PROXY_URL` set + `NEWS_API_KEY` secret configured server-side
- [ ] Deploy succeeds — app loads in Demo mode by default

### Hackathon submission
- [ ] Demo URL recorded
- [ ] README updated with demo URL and screenshots
- [ ] Judges can navigate dashboard, map, and zone details without setup

---

## Project Structure

```
shadowgrid-ai/
├── public/
├── src/
│   ├── components/
│   │   ├── common/            # RiskBadge, CategoryIcon, RiskScoreRing, AiZoneInsight
│   │   ├── dashboard/         # CityRiskMap, StatCard, FailureChainPanel, RecentSignalsPanel …
│   │   ├── layouts/           # AppLayout (sidebar + topbar)
│   │   └── map/               # ZoneSidePanel (map drill-down)
│   ├── engine/                # 8 scoring/analysis modules (pure functions)
│   │   │                      # scoring, signalCluster, zoneGraph, timeDecay,
│   │   │                      # failureChain, recommendations, teamAllocation, explainer
│   ├── pages/                 # LandingPage, DashboardPage, MapPage, AnalyticsPage,
│   │                          # ZoneDetailsPage, ReportPage, OperationsPage, NotFound
│   ├── services/              # dataService, weatherService, newsService,
│   │                          # ingestionService, aiService, geocodeService,
│   │                          # livePersistence, zoneGenerator
│   ├── store/                 # AppContext (reactive store)
│   ├── lib/                   # appConfig, constants, mockData, dataMode, uiHelpers
│   ├── types/                 # types.ts (all domain types)
│   └── db/                    # supabase.ts (client)
├── supabase/
│   ├── functions/
│   │   ├── llm-explain/       # LLM zone explanation (Gemini)
│   │   ├── news-classify/     # NLP news classifier (Gemini)
│   │   ├── news-proxy/        # NewsAPI CORS proxy
│   │   └── zone-names/        # Zone name resolver
│   ├── migrations/            # 00001–00004 schema migrations
│   ├── seed.sql               # 7 zones + demo data (Metroville)
│   └── live_seed_mumbai.sql   # Optional live seed for Mumbai
├── .env.example
├── SETUP.md
└── README.md
```

---

## Risk Scoring Formula

```
Risk Score = 0.30 × Citizen Complaint Density
           + 0.25 × Weather Severity
           + 0.20 × Public Signal Strength
           + 0.15 × Historical Failure Rate
           + 0.10 × Adjacent Zone Propagation
```

Scores are recomputed on every signal event across 6 categories: `drainage`, `road`, `water`, `power`, `traffic`, `emergency_access`. Each score includes a plain-English explanation with dominant factor and source attribution.

---

## License

MIT — free to use, modify, and distribute.

---

> Built for a hackathon in 2026. ShadowGrid AI · Metroville Demo City
