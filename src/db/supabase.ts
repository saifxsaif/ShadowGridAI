// ShadowGrid AI — Supabase client
// All config comes from appConfig (single source of truth for env vars).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/appConfig';

// createClient tolerates empty strings — queries will simply fail and the
// service layer falls back to seeded data when Supabase is unconfigured.
export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
);
