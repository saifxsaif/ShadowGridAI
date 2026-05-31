// ShadowGrid AI — Runtime Data Mode resolver
//
// The app exposes a single user-selectable runtime mode: 'demo' | 'live'.
//   demo — read the stable seeded dataset from the DB (dataset_type='demo')
//   live — read the live, ingested dataset from the DB (dataset_type='live')
//
// The selected mode is persisted in localStorage so a refresh keeps it.
// The default (and reset target) is always 'demo' for a safe presentation.

import type { DatasetType } from '@/types/types';
import { SUPABASE_CONFIGURED, NEWS_CONFIGURED } from '@/lib/appConfig';

export type DataMode = DatasetType; // 'demo' | 'live'

export const DEFAULT_DATA_MODE: DataMode = 'demo';

const STORAGE_KEY = 'shadowgrid.dataMode';

// ─── Persistence ──────────────────────────────────────────────────────────────

/** Reads the persisted mode from localStorage, defaulting to 'demo'. */
export function getStoredDataMode(): DataMode {
  if (typeof localStorage === 'undefined') return DEFAULT_DATA_MODE;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'live' ? 'live' : DEFAULT_DATA_MODE;
}

/** Persists the selected mode to localStorage. */
export function storeDataMode(mode: DataMode): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, mode);
}

/** Clears the persisted mode, returning the app to the default Demo mode. */
export function clearStoredDataMode(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Labels & descriptions ──────────────────────────────────────────────────

export const DATA_MODE_LABELS: Record<DataMode, string> = {
  demo: 'Demo',
  live: 'Live',
};

export const DATA_MODE_DESCRIPTIONS: Record<DataMode, string> = {
  demo: 'Stable seeded dataset for presentation. Deterministic and always available, even if external APIs are offline.',
  live: 'Real ingested dataset. Live weather (Open-Meteo) and news (NewsAPI) signals are normalised, stored, and scored over time.',
};

// ─── Capability helpers ───────────────────────────────────────────────────────

/** Live mode can fetch real external signals only when those APIs are wired. */
export interface DataModeCapabilities {
  supabaseConfigured: boolean;
  newsConfigured: boolean;
  /** True when live ingestion can pull real news (else weather-only live). */
  liveNewsAvailable: boolean;
}

export function getCapabilities(): DataModeCapabilities {
  return {
    supabaseConfigured: SUPABASE_CONFIGURED,
    newsConfigured: NEWS_CONFIGURED,
    liveNewsAvailable: NEWS_CONFIGURED,
  };
}
