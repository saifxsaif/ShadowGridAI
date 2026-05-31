// ShadowGrid AI — Open-Meteo weather ingestion service
//
// Open-Meteo is completely free and requires no API key.
// Docs: https://open-meteo.com/en/docs
//
// This module:
//   1. Fetches current weather + 24-hour forecast for a lat/lng
//   2. Derives a WeatherSnapshot (severity + risk-relevant values)
//   3. Maps snapshots to city zones by proximity
//   4. Normalises them into ExternalSignal objects for the scoring engine
//
// TODO: Add hourly accumulation window (6h, 12h rainfall totals)
// TODO: Add lightning / wind-gust thresholds for emergency_access risk

import type { Zone, ExternalSignal, SignalType, Severity } from '@/types/types';
import { OPEN_METEO_BASE_URL, DEMO_CITY } from '@/lib/appConfig';
import { DEMO_EXTERNAL_SIGNALS } from '@/lib/mockData';

// ─── Open-Meteo response shape (subset we care about) ────────────────────────

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    precipitation: number;           // mm in last hour
    rain: number;
    showers: number;
    snowfall: number;
    wind_speed_10m: number;          // km/h
    wind_gusts_10m: number;
    weather_code: number;            // WMO weather code
  };
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
  };
}

// ─── Derived weather snapshot ─────────────────────────────────────────────────

export interface WeatherSnapshot {
  zone_id: string;
  lat: number;
  lng: number;
  temperature_c: number;
  precipitation_mm: number;         // current-hour rainfall
  forecast_6h_total: number;        // sum of next 6 hourly values
  wind_speed_kmh: number;
  wind_gusts_kmh: number;
  weather_code: number;
  severity: Severity;
  risk_score_boost: number;         // 0-100 additive boost for weather component
  fetched_at: string;
}

// ─── WMO weather code to severity mapping ────────────────────────────────────
// https://open-meteo.com/en/docs#weathervariables  (WMO code table)

function wmoToSeverity(code: number): Severity {
  // 0-3: clear/few clouds → low
  if (code <= 3)  return 'low';
  // 51-67: drizzle/rain → medium
  if (code >= 51 && code <= 67) return 'medium';
  // 71-77: snowfall  → medium
  if (code >= 71 && code <= 77) return 'medium';
  // 80-82: rain showers → medium/high
  if (code >= 80 && code <= 82) return 'high';
  // 95-99: thunderstorm → critical
  if (code >= 95)  return 'critical';
  // 45-48: fog → medium
  if (code >= 45 && code <= 48) return 'medium';
  return 'low';
}

// Converts weather values into a 0-100 risk boost number used by scoring.ts
function computeRiskBoost(
  precipitation: number,
  forecast6h: number,
  windGusts: number,
  code: number,
): number {
  let boost = 0;
  // Precipitation component: 1mm → +5 pts, capped at 50
  boost += Math.min(50, precipitation * 5);
  // Forecast accumulation: >10mm in next 6h = serious
  boost += Math.min(25, forecast6h * 2.5);
  // Wind gusts: >80 km/h = +15
  if (windGusts > 80) boost += 15;
  else if (windGusts > 50) boost += 8;
  // Thunderstorm codes
  if (code >= 95) boost += 20;
  return Math.min(100, Math.round(boost));
}

// ─── Fetch weather for one coordinate ────────────────────────────────────────

async function fetchWeatherAt(lat: number, lng: number): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude:    lat.toString(),
    longitude:   lng.toString(),
    current:     'temperature_2m,precipitation,rain,showers,snowfall,wind_speed_10m,wind_gusts_10m,weather_code',
    hourly:      'precipitation,precipitation_probability,wind_speed_10m',
    forecast_days: '2',
    timezone:    'auto',
  });
  const url = `${OPEN_METEO_BASE_URL}/forecast?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  return res.json() as Promise<OpenMeteoResponse>;
}

// ─── Derive snapshot from raw response ────────────────────────────────────────

function deriveSnapshot(
  zoneId: string,
  lat: number,
  lng: number,
  raw: OpenMeteoResponse,
): WeatherSnapshot {
  const cur = raw.current;
  // Sum next 6 hourly precipitation values from current time onward
  const nowIndex = raw.hourly.time.findIndex(t => t >= cur.time);
  const slice = raw.hourly.precipitation.slice(
    Math.max(0, nowIndex),
    Math.max(0, nowIndex) + 6,
  );
  const forecast6h = slice.reduce((s, v) => s + (v ?? 0), 0);

  const severity   = wmoToSeverity(cur.weather_code);
  const riskBoost  = computeRiskBoost(cur.precipitation, forecast6h, cur.wind_gusts_10m, cur.weather_code);

  return {
    zone_id:          zoneId,
    lat, lng,
    temperature_c:    cur.temperature_2m,
    precipitation_mm: cur.precipitation,
    forecast_6h_total: Math.round(forecast6h * 10) / 10,
    wind_speed_kmh:   cur.wind_speed_10m,
    wind_gusts_kmh:   cur.wind_gusts_10m,
    weather_code:     cur.weather_code,
    severity,
    risk_score_boost: riskBoost,
    fetched_at:       new Date().toISOString(),
  };
}

// ─── Zone proximity matching ──────────────────────────────────────────────────
// For MVP we use the centroid of each zone and assign weather to the nearest
// zone when a city-level fetch is used.  When fetching per-zone we assign
// directly.
//
// TODO: Replace with polygon-centroid distance for more accuracy.

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assignSnapshotToZone(
  snapshot: Omit<WeatherSnapshot, 'zone_id'>,
  zones: Zone[],
): WeatherSnapshot {
  const closest = zones.reduce((best, z) => {
    const dist = haversineKm(snapshot.lat, snapshot.lng, z.lat, z.lng);
    return dist < best.dist ? { zone: z, dist } : best;
  }, { zone: zones[0], dist: Infinity });
  return { ...snapshot, zone_id: closest.zone.id };
}

// ─── Normalise snapshot → ExternalSignal ─────────────────────────────────────

function snapshotToSignal(snap: WeatherSnapshot): ExternalSignal {
  const signalType: SignalType =
    snap.weather_code >= 95 ? 'weather_alert' : 'heavy_rainfall';

  const keywords: string[] = [];
  if (snap.precipitation_mm > 5) keywords.push('heavy rain', 'rainfall');
  if (snap.forecast_6h_total > 15) keywords.push('flood risk', 'drainage overflow');
  if (snap.wind_gusts_kmh > 60) keywords.push('strong winds', 'storm');
  if (snap.weather_code >= 95) keywords.push('thunderstorm', 'lightning');
  if (keywords.length === 0) keywords.push('weather update');

  const title =
    snap.severity === 'critical' ? `Severe weather alert — ${DEMO_CITY}` :
    snap.severity === 'high'     ? `Heavy rainfall warning — ${DEMO_CITY}` :
    snap.severity === 'medium'   ? `Moderate rainfall detected — ${DEMO_CITY}` :
                                   `Weather update — ${DEMO_CITY}`;

  const summary =
    `${snap.precipitation_mm}mm precipitation in last hour. ` +
    (snap.forecast_6h_total > 5 ? `${snap.forecast_6h_total}mm forecast in next 6h. ` : '') +
    (snap.wind_gusts_kmh > 40 ? `Wind gusts up to ${snap.wind_gusts_kmh}km/h. ` : '') +
    `Risk boost: +${snap.risk_score_boost}/100.`;

  return {
    id:                `weather-${snap.zone_id}-${Date.now()}`,
    signal_type:       signalType,
    zone_id:           snap.zone_id,
    source:            'weather',
    severity:          snap.severity,
    confidence:        snap.severity === 'critical' ? 0.95 : snap.severity === 'high' ? 0.85 : 0.70,
    detected_keywords: keywords,
    title,
    summary,
    raw_payload:       snap as unknown as Record<string, unknown>,
    created_at:        snap.fetched_at,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface WeatherIngestionResult {
  signals:   ExternalSignal[];
  snapshots: WeatherSnapshot[];
  source:    'live' | 'fallback';
  error?:    string;
}

/**
 * Fetches live weather for all zones and returns normalised ExternalSignals.
 * Falls back to seeded weather signals if Open-Meteo is unreachable.
 */
export async function ingestWeatherSignals(
  zones: Zone[],
): Promise<WeatherIngestionResult> {
  if (zones.length === 0) {
    return { signals: [], snapshots: [], source: 'fallback', error: 'No zones provided' };
  }

  try {
    // Fetch one weather point per zone (throttled — max 3 concurrent)
    // Open-Meteo free tier: no rate limit in practice, but we batch to be safe.
    const BATCH = 3;
    const snapshots: WeatherSnapshot[] = [];

    for (let i = 0; i < zones.length; i += BATCH) {
      const batch = zones.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(z => fetchWeatherAt(z.lat, z.lng).then(raw => deriveSnapshot(z.id, z.lat, z.lng, raw)))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') snapshots.push(r.value);
      }
    }

    if (snapshots.length === 0) throw new Error('All Open-Meteo requests failed');

    // Only emit signals for zones with meaningful weather risk
    const signals = snapshots
      .filter(s => s.risk_score_boost >= 5 || s.severity !== 'low')
      .map(snapshotToSignal);

    return { signals, snapshots, source: 'live' };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Weather fetch failed';
    // Return seeded fallback weather signals
    const fallbackSignals = DEMO_EXTERNAL_SIGNALS.filter(s => s.source === 'weather');
    return { signals: fallbackSignals, snapshots: [], source: 'fallback', error };
  }
}

/** Export the risk-boost value for use inside scoring.ts */
export { computeRiskBoost as computeWeatherRiskBoost };
