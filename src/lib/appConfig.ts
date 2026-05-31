// ShadowGrid AI — Centralised runtime configuration
//
// All env-var access goes through this module.  No page, service, or engine
// file should call `import.meta.env` directly — import from here instead.
//
// Three operation modes (resolved at runtime):
//   MOCK   — no Supabase keys present; uses only seeded local data
//   HYBRID — Supabase keys present but external API keys absent; persists
//            to/from Supabase, falls back to seeded signals for weather/news
//   LIVE   — all keys present; full persistence + live external ingestion

// ─── Raw env access ───────────────────────────────────────────────────────────

const env = import.meta.env;

// ─── Supabase ─────────────────────────────────────────────────────────────────

export const SUPABASE_URL: string        = env.VITE_SUPABASE_URL       ?? '';
export const SUPABASE_ANON_KEY: string   = env.VITE_SUPABASE_ANON_KEY  ?? '';

// ─── External API keys ────────────────────────────────────────────────────────

// NewsAPI (https://newsapi.org)  — free tier supports ~100 req/day
export const NEWS_API_KEY: string = env.VITE_NEWS_API_KEY ?? '';

// Open-Meteo is free and requires NO api key — but we expose a base-URL
// override so tests/CI can point to a mock server.
export const OPEN_METEO_BASE_URL: string =
  env.VITE_OPEN_METEO_BASE_URL ?? 'https://api.open-meteo.com/v1';

// Optional NewsAPI proxy (avoids CORS in browser — point to an edge function
// or Vercel API route that forwards requests).
export const NEWS_API_PROXY_URL: string =
  env.VITE_NEWS_API_PROXY_URL ?? '';

// ─── App identity ─────────────────────────────────────────────────────────────

export const DEMO_CITY: string = env.VITE_DEMO_CITY ?? 'Metroville';

// ─── Data mode resolution ────────────────────────────────────────────────────

export type DataMode = 'mock' | 'hybrid' | 'live';

export function resolveDataMode(): DataMode {
  const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  const hasExternalApis = Boolean(NEWS_API_KEY);   // Open-Meteo is keyless
  if (!hasSupabase)  return 'mock';
  if (!hasExternalApis) return 'hybrid';
  return 'live';
}

export const DATA_MODE: DataMode = resolveDataMode();

export const DATA_MODE_LABELS: Record<DataMode, string> = {
  mock:   'Mock / Seeded',
  hybrid: 'Supabase + Seeded Signals',
  live:   'Supabase + Live APIs',
};

export const DATA_MODE_DESCRIPTIONS: Record<DataMode, string> = {
  mock:   'Running on seeded demo data. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable persistence.',
  hybrid: 'Persisting to Supabase. Add VITE_NEWS_API_KEY to enable live news signal ingestion.',
  live:   'Fully live: Supabase persistence + Open-Meteo weather + NewsAPI news signals.',
};
