// ShadowGrid AI — External Signal Ingestion Orchestrator
//
// Coordinates all external data sources into a unified ingestion flow:
//   1. Weather  → Open-Meteo (free, no key)
//   2. News     → NewsAPI (free tier, key optional)
//
// The orchestrator:
//   - Runs both ingestions in parallel
//   - Merges live + existing signals (deduplicates by id prefix)
//   - Persists new signals to Supabase when available
//   - Always returns signals safe for passing to runEngine()
//
// Entry points:
//   ingestExternalSignals(zones, existing) → IngestResult
//   persistSignalsToSupabase(signals)       → void (best-effort)
//
// TODO: Add sensor/IoT ingestion module
// TODO: Support scheduled execution (cron/edge function trigger)

import type { Zone, ExternalSignal } from '@/types/types';
import { ingestWeatherSignals, type WeatherIngestionResult } from './weatherService';
import { ingestNewsSignals, type NewsIngestionResult } from './newsService';
import { supabase } from '@/db/supabase';
import { DATA_MODE } from '@/lib/appConfig';

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

// ─── Supabase persistence ─────────────────────────────────────────────────────

export async function persistSignalsToSupabase(signals: ExternalSignal[]): Promise<void> {
  if (DATA_MODE === 'mock' || signals.length === 0) return;

  // Upsert in batches of 20
  const BATCH = 20;
  for (let i = 0; i < signals.length; i += BATCH) {
    const batch = signals.slice(i, i + BATCH);
    const rows = batch.map(s => ({
      id:                s.id,
      signal_type:       s.signal_type,
      zone_id:           s.zone_id,
      source:            s.source,
      severity:          s.severity,
      confidence:        s.confidence,
      detected_keywords: s.detected_keywords,
      title:             s.title,
      summary:           s.summary,
      raw_payload:       s.raw_payload ?? null,
      created_at:        s.created_at,
    }));
    // Best-effort — ignore conflicts (same id = already stored)
    const upsertResult = await supabase.from('external_signals').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (upsertResult.error) {
      // Non-fatal — ingestion data is already live in app state
    }
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Runs all external ingestion sources in parallel and returns a merged set
 * of ExternalSignals safe for feeding into the scoring engine.
 *
 * @param zones          All city zones (for proximity matching)
 * @param existingSignals Currently held signals (from AppContext state)
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
      return { signals: [], articles: 0, matched: 0, source: 'fallback' as const, error: msg };
    }),
  ]);

  if (weatherResult.error) errors.push(`Weather: ${weatherResult.error}`);
  if (newsResult.error)    errors.push(`News: ${newsResult.error}`);

  const newSignals = [...weatherResult.signals, ...newsResult.signals];
  const merged     = deduplicateSignals(newSignals, existingSignals);

  // Persist new live signals to Supabase (best-effort, non-blocking)
  const hasLiveSignals = newSignals.some(s => s.source !== 'seeded');
  if (hasLiveSignals) {
    persistSignalsToSupabase(newSignals).catch(() => {});
  }

  return {
    signals:        merged,
    newSignalCount: newSignals.length,
    weather:        weatherResult,
    news:           newsResult,
    persisted:      hasLiveSignals,
    errors,
    ingestedAt,
  };
}
