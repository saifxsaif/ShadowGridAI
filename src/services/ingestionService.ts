// ShadowGrid AI — External Signal Ingestion Orchestrator
//
// Coordinates all external data sources into a unified ingestion flow:
//   1. Weather  → Open-Meteo (free, no key)
//   2. News     → NewsAPI (free tier, key optional)
//
// Ingestion ONLY runs for the LIVE dataset. All produced signals are tagged
// dataset_type='live' and persisted via livePersistence (demo rows untouched).
//
// The orchestrator:
//   - Runs both ingestions in parallel
//   - Merges new live signals with existing live signals (deduplicated)
//   - Persists new signals to the live dataset when Supabase is configured
//   - Always returns signals safe for passing to runEngine()
//
// Entry point:
//   ingestExternalSignals(zones, existing) → IngestResult
//
// TODO: Add sensor/IoT ingestion module
// TODO: Support scheduled execution (cron/edge function trigger)

import type { Zone, ExternalSignal } from '@/types/types';
import { ingestWeatherSignals, type WeatherIngestionResult } from './weatherService';
import { ingestNewsSignals, type NewsIngestionResult } from './newsService';
import { persistLiveSignals } from './livePersistence';

// ─── Result shape ─────────────────────────────────────────────────────────────

export interface IngestResult {
  signals:        ExternalSignal[];  // merged: live new + existing
  newSignalCount: number;
  weather:        WeatherIngestionResult;
  news:           NewsIngestionResult;
  persisted:      boolean;
  errors:         string[];
  ingestedAt:     string;
}

// ─── Deduplication ────────────────────────────────────────────────────────────
// Keep the most-recent signal for each (zone_id, signal_type) pair within
// a 4-hour window to avoid flooding the scoring engine with near-duplicates.

function deduplicateSignals(incoming: ExternalSignal[], existing: ExternalSignal[]): ExternalSignal[] {
  const WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours
  const now = Date.now();

  // Start from recent existing (not older than 24h)
  const recentExisting = existing.filter(
    s => now - new Date(s.created_at).getTime() < 24 * 60 * 60 * 1000
  );

  // Build set of (zone_id, signal_type) keys already present within window
  const inWindowKeys = new Set<string>();
  for (const s of recentExisting) {
    if (now - new Date(s.created_at).getTime() < WINDOW_MS) {
      inWindowKeys.add(`${s.zone_id}:${s.signal_type}`);
    }
  }

  // Only add incoming signals not already represented in the window
  const added: ExternalSignal[] = [];
  for (const s of incoming) {
    const key = `${s.zone_id}:${s.signal_type}`;
    if (!inWindowKeys.has(key)) {
      added.push(s);
      inWindowKeys.add(key);
    }
  }

  // Merge: new signals first, then recent existing, sorted by created_at desc
  return [...added, ...recentExisting].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Runs all external ingestion sources in parallel and returns a merged set
 * of ExternalSignals (tagged dataset_type='live') safe for feeding into the
 * scoring engine. New live signals are persisted to the live dataset.
 *
 * @param zones          All city zones (for proximity matching)
 * @param existingSignals Currently held live signals (from AppContext state)
 */
export async function ingestExternalSignals(
  zones: Zone[],
  existingSignals: ExternalSignal[],
): Promise<IngestResult> {
  const ingestedAt = new Date().toISOString();
  const errors: string[] = [];

  // Run weather + news ingestion in parallel
  const [weatherResult, newsResult] = await Promise.all([
    ingestWeatherSignals(zones).catch(e => {
      const msg = e instanceof Error ? e.message : 'Weather ingestion failed';
      errors.push(msg);
      return { signals: [], snapshots: [], source: 'fallback' as const, error: msg };
    }),
    ingestNewsSignals(zones).catch(e => {
      const msg = e instanceof Error ? e.message : 'News ingestion failed';
      errors.push(msg);
      return { signals: [], articles: 0, matched: 0, source: 'fallback' as const, classifier: 'none' as const, error: msg };
    }),
  ]);

  if (weatherResult.error) errors.push(`Weather: ${weatherResult.error}`);
  if (newsResult.error)    errors.push(`News: ${newsResult.error}`);

  // Tag every produced signal as belonging to the live dataset
  const newSignals: ExternalSignal[] = [...weatherResult.signals, ...newsResult.signals]
    .map(s => ({ ...s, dataset_type: 'live' as const }));
  const merged = deduplicateSignals(newSignals, existingSignals);

  // Persist new live signals to the live dataset (best-effort, non-blocking)
  const hasNewSignals = newSignals.length > 0;
  if (hasNewSignals) {
    persistLiveSignals(newSignals).catch(() => {});
  }

  return {
    signals:        merged,
    newSignalCount: newSignals.length,
    weather:        weatherResult,
    news:           newsResult,
    persisted:      hasNewSignals,
    errors,
    ingestedAt,
  };
}
