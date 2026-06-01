// ShadowGrid AI — Live city zone generator
//
// Generates a set of city zones procedurally around a geocoded city center.
// Coordinates are deterministic (same city → same layout every time).
// Zone names are optionally enriched by Gemini; if AI is unavailable the
// generator falls back to generic directional names ("London Central", etc.).
//
// Layout: 1 central zone + 6 surrounding zones in a ring, giving 7 zones
// that match the demo dataset count and keep the adjacency graph coherent.

import type { Zone } from '@/types/types';
import type { CityLocation } from '@/services/geocodeService';
import { FUNCTIONS_BASE_URL, AI_ENABLED, SUPABASE_ANON_KEY } from '@/lib/appConfig';
import { supabase } from '@/db/supabase';

// ─── Grid geometry ────────────────────────────────────────────────────────────
// Each zone is a ~1.5 km × 1.5 km square. The ring radius is ~2.5 km from
// center so zones don't overlap and the whole city footprint is ~6 km across.

const DEG_PER_KM_LAT = 1 / 111;          // ~0.009° per km
const ZONE_HALF = 0.007;                  // half-side of each square in degrees (~0.78 km)
const RING_RADIUS_LAT = 0.022;            // ring offset in lat degrees (~2.4 km)
const RING_RADIUS_LNG_FACTOR = 1.4;       // lng degrees are wider at mid-latitudes

// 7 zone positions: index 0 = center, 1-6 = ring at 60° intervals
function zoneOffsets(lat: number): Array<[number, number]> {
  const lngFactor = 1 / Math.cos((lat * Math.PI) / 180);
  const r = RING_RADIUS_LAT;
  const rl = r * lngFactor * RING_RADIUS_LNG_FACTOR;
  return [
    [0, 0],                                          // 0 — center
    [r, 0],                                          // 1 — north
    [r * 0.5, rl * 0.866],                           // 2 — north-east
    [-r * 0.5, rl * 0.866],                          // 3 — south-east
    [-r, 0],                                         // 4 — south
    [-r * 0.5, -rl * 0.866],                         // 5 — south-west
    [r * 0.5, -rl * 0.866],                          // 6 — north-west
  ];
}

function makePolygon(lat: number, lng: number): [number, number][] {
  const h = ZONE_HALF;
  const lngFactor = 1 / Math.cos((lat * Math.PI) / 180);
  const hl = h * lngFactor;
  return [
    [lat - h, lng - hl],
    [lat - h, lng + hl],
    [lat + h, lng + hl],
    [lat + h, lng - hl],
  ];
}

// Adjacency: center (0) is adjacent to all ring zones; ring zones are adjacent
// to center + their two immediate ring neighbors.
function buildAdjacency(ids: string[]): string[][] {
  const adj: string[][] = Array.from({ length: 7 }, () => []);
  // center ↔ all ring
  for (let i = 1; i <= 6; i++) {
    adj[0].push(ids[i]);
    adj[i].push(ids[0]);
  }
  // ring neighbors
  for (let i = 1; i <= 6; i++) {
    const prev = i === 1 ? 6 : i - 1;
    const next = i === 6 ? 1 : i + 1;
    adj[i].push(ids[prev], ids[next]);
  }
  return adj;
}

// Deterministic pseudo-random from a string seed (djb2 hash)
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function deterministicInt(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
}

// Static risk attributes — varied but deterministic per zone
function zoneAttributes(id: string, index: number): {
  vulnerability_score: number;
  flood_sensitivity: number;
  historical_failure_rate: number;
  elevation_m: number;
  population_density: 'low' | 'medium' | 'high';
} {
  const s = hashSeed(id);
  // Center zone tends to be higher density/vulnerability
  const densityOptions: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  return {
    vulnerability_score:    deterministicInt(s ^ 0x1a2b, index === 0 ? 55 : 30, index === 0 ? 85 : 75),
    flood_sensitivity:      deterministicInt(s ^ 0x3c4d, 15, 90),
    historical_failure_rate: deterministicInt(s ^ 0x5e6f, 20, 75),
    elevation_m:            deterministicInt(s ^ 0x7a8b, 1, 40),
    population_density:     densityOptions[deterministicInt(s ^ 0x9c0d, 0, 2)],
  };
}

// ─── Fallback names ───────────────────────────────────────────────────────────

const FALLBACK_SUFFIXES = [
  'Central', 'North', 'North-East', 'South-East', 'South', 'South-West', 'North-West',
];

function fallbackNames(cityName: string): string[] {
  return FALLBACK_SUFFIXES.map(s => `${cityName} ${s}`);
}

// ─── Gemini name enrichment ───────────────────────────────────────────────────
// Calls the zone-names Edge Function which asks Gemini for 7 plausible district
// names for the city. Returns null if AI is unavailable or the call fails.

async function fetchGeminiZoneNames(cityName: string): Promise<string[] | null> {
  if (!AI_ENABLED || !FUNCTIONS_BASE_URL) return null;
  try {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/zone-names`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ city: cityName }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.names) || data.names.length < 7) return null;
    return data.names.slice(0, 7) as string[];
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GeneratedZoneSet {
  zones: Zone[];
  namesSource: 'ai' | 'fallback';
}

/**
 * Generates 7 live city zones procedurally around the given city center.
 * Coordinates are deterministic. Names are AI-enriched when possible.
 */
export async function generateCityZones(city: CityLocation): Promise<GeneratedZoneSet> {
  const offsets = zoneOffsets(city.lat);
  const ids = offsets.map((_, i) => `live-zone-${i.toString().padStart(2, '0')}`);
  const adjacency = buildAdjacency(ids);

  // Try Gemini for names; fall back to directional names
  let names: string[];
  let namesSource: 'ai' | 'fallback' = 'fallback';
  const aiNames = await fetchGeminiZoneNames(city.name);
  if (aiNames) {
    names = aiNames;
    namesSource = 'ai';
  } else {
    names = fallbackNames(city.name);
  }

  const now = new Date().toISOString();
  const zones: Zone[] = offsets.map(([dLat, dLng], i) => {
    const lat = city.lat + dLat;
    const lng = city.lng + dLng;
    const id = ids[i];
    const attrs = zoneAttributes(id, i);
    return {
      id,
      name: names[i],
      city: city.name,
      lat,
      lng,
      polygon: makePolygon(lat, lng),
      ...attrs,
      adjacent_zone_ids: adjacency[i],
      infrastructure_notes: `Auto-generated zone for ${city.name}. Infrastructure data pending real survey.`,
      created_at: now,
      dataset_type: 'live',
    };
  });

  return { zones, namesSource };
}

/** Persists generated live zones to Supabase. Returns true on success. */
export async function persistLiveZones(zones: Zone[]): Promise<boolean> {
  if (zones.length === 0) return false;
  try {
    const rows = zones.map(z => ({
      id:                     z.id,
      name:                   z.name,
      city:                   z.city,
      lat:                    z.lat,
      lng:                    z.lng,
      polygon:                z.polygon ?? null,
      vulnerability_score:    z.vulnerability_score,
      flood_sensitivity:      z.flood_sensitivity,
      historical_failure_rate: z.historical_failure_rate,
      elevation_m:            z.elevation_m,
      population_density:     z.population_density,
      adjacent_zone_ids:      z.adjacent_zone_ids,
      infrastructure_notes:   z.infrastructure_notes ?? '',
      dataset_type:           'live',
    }));
    const { error } = await supabase
      .from('zones')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
    return !error;
  } catch {
    return false;
  }
}

/** Deletes all live zones from Supabase. */
export async function deleteLiveZones(): Promise<boolean> {
  try {
    const { error } = await supabase.from('zones').delete().eq('dataset_type', 'live');
    return !error;
  } catch {
    return false;
  }
}
