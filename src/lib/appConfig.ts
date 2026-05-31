// ShadowGrid AI — Centralised runtime configuration
//
// All env-var access goes through this module.  No page, service, or engine
// file should call `import.meta.env` directly — import from here instead.
//
// Two RUNTIME data modes (user-selectable at runtime, see lib/dataMode.ts):
//   DEMO — stable seeded dataset stored in the DB (dataset_type='demo').
//          Deterministic, presentation-safe, unaffected by external APIs.
//   LIVE — real ingested dataset stored in the DB (dataset_type='live').
//          Populated over time from Open-Meteo weather + NewsAPI news.
//
// The env vars below describe CAPABILITIES (what backends are configured),
// not the active mode. The active mode is chosen by the user at runtime.

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

// ─── Capability flags ─────────────────────────────────────────────────────────
// These describe which backends are wired up, used by the service layer to
// decide whether to hit Supabase / external APIs or fall back to seeded data.

/** True when a Supabase project URL + anon key are present. */
export const SUPABASE_CONFIGURED: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when live news ingestion is possible — either a direct NewsAPI key
 *  or a server-side proxy URL (Supabase Edge Function / Vercel route). */
export const NEWS_CONFIGURED: boolean = Boolean(NEWS_API_KEY || NEWS_API_PROXY_URL);
