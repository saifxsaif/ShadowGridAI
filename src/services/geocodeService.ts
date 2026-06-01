// ShadowGrid AI — City geocoding (Open-Meteo Geocoding API, free, no key)
//
// Resolves a city name (VITE_LIVE_CITY for live mode) into map coordinates so
// the UI and map always reflect the configured city.
// Results are cached in localStorage so we only hit the network once per city.
//
// Docs: https://open-meteo.com/en/docs/geocoding-api

export interface CityLocation {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  country?: string;
}

const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const CACHE_PREFIX = 'shadowgrid.geocode.';

interface GeocodeResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  }>;
}

function cacheKey(name: string): string {
  return `${CACHE_PREFIX}${name.trim().toLowerCase()}`;
}

function readCache(name: string): CityLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(name));
    return raw ? (JSON.parse(raw) as CityLocation) : null;
  } catch {
    return null;
  }
}

function writeCache(name: string, loc: CityLocation): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(name), JSON.stringify(loc));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/**
 * Resolves a city name to coordinates. Returns the cached value immediately if
 * present, otherwise queries Open-Meteo. Returns `fallback` if the city cannot
 * be resolved (e.g. a fictional demo city like "Metroville", or offline).
 */
export async function geocodeCity(
  name: string,
  fallback: CityLocation,
): Promise<CityLocation> {
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const cached = readCache(trimmed);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({ name: trimmed, count: '1', format: 'json' });
    const res = await fetch(`${GEOCODE_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
    const json = (await res.json()) as GeocodeResponse;
    const top = json.results?.[0];
    if (!top) {
      // Unresolvable (fictional city, typo, etc.) — keep the configured name
      // but use the fallback coordinates so the map still renders.
      const loc: CityLocation = { ...fallback, name: trimmed };
      writeCache(trimmed, loc);
      return loc;
    }
    const loc: CityLocation = {
      name: trimmed,
      lat: top.latitude,
      lng: top.longitude,
      zoom: 12,
      country: top.country,
    };
    writeCache(trimmed, loc);
    return loc;
  } catch {
    return { ...fallback, name: trimmed };
  }
}
