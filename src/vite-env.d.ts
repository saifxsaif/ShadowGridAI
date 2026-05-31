/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_NEWS_API_KEY?: string;
  readonly VITE_NEWS_API_PROXY_URL?: string;
  readonly VITE_OPEN_METEO_BASE_URL?: string;
  readonly VITE_DEMO_CITY?: string;
  readonly VITE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
