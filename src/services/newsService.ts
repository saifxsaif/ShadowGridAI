// ShadowGrid AI — NewsAPI news signal ingestion service
//
// NewsAPI (https://newsapi.org) free tier: ~100 req/day, headlines only.
// IMPORTANT: newsapi.org blocks direct browser requests on free tier.
//   → Set VITE_NEWS_API_PROXY_URL to a Vercel API route or Supabase Edge
//     Function that forwards the request server-side.
//   → When VITE_NEWS_API_PROXY_URL is absent this module attempts a direct
//     fetch (works in local Node environments, Vercel server functions, etc.)
//     and falls back to seeded signals if the request is blocked.
//
// This module:
//   1. Queries city-specific infrastructure keywords
//   2. Scores each article for relevant keywords
//   3. Assigns articles to zones via location keyword matching
//   4. Normalises into ExternalSignal objects
//
// TODO: Replace NewsAPI with a CORS-friendly endpoint or Edge Function proxy
//       for production Vercel browser deployments.
// TODO: Add sentiment analysis layer for better severity classification.

import type { Zone, ExternalSignal, SignalType, Severity } from '@/types/types';
import { NEWS_API_KEY, NEWS_API_PROXY_URL, SUPABASE_ANON_KEY, DEMO_CITY } from '@/lib/appConfig';

// ─── NewsAPI response shape ───────────────────────────────────────────────────

interface NewsArticle {
  source:      { id: string | null; name: string };
  title:       string;
  description: string | null;
  url:         string;
  publishedAt: string;
}

interface NewsApiResponse {
  status:    string;
  totalResults: number;
  articles: NewsArticle[];
}

// ─── Keyword detection rules ──────────────────────────────────────────────────

interface KeywordRule {
  keywords:    string[];
  signalType:  SignalType;
  severity:    Severity;
  category:    string;   // maps to RiskCategory labels in scoring
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords:   ['flood', 'flooded', 'flooding', 'inundated', 'flash flood'],
    signalType: 'news_flooding',
    severity:   'high',
    category:   'drainage',
  },
  {
    keywords:   ['blocked drain', 'clogged drain', 'overflow drain', 'drain overflow', 'sewer overflow'],
    signalType: 'news_flooding',
    severity:   'medium',
    category:   'drainage',
  },
  {
    keywords:   ['road closed', 'road closure', 'blocked road', 'road blocked', 'road damage'],
    signalType: 'news_road_closure',
    severity:   'medium',
    category:   'road',
  },
  {
    keywords:   ['power outage', 'power cut', 'blackout', 'electrical failure', 'power failure', 'grid failure'],
    signalType: 'news_power_outage',
    severity:   'high',
    category:   'power',
  },
  {
    keywords:   ['water shortage', 'water supply', 'water pressure', 'no water', 'water disruption', 'water cut'],
    signalType: 'news_water_shortage',
    severity:   'medium',
    category:   'water',
  },
  {
    keywords:   ['traffic disruption', 'traffic jam', 'congestion', 'gridlock', 'road accident'],
    signalType: 'news_traffic_disruption',
    severity:   'low',
    category:   'traffic',
  },
];

// ─── Zone keyword matching ────────────────────────────────────────────────────
// Maps zone names / district keywords to zone IDs.
// Extend this list as zones are added.

interface ZoneKeywordMap {
  zoneId:   string;
  keywords: string[];
}

function buildZoneKeywords(zones: Zone[]): ZoneKeywordMap[] {
  return zones.map(z => ({
    zoneId:   z.id,
    keywords: [
      z.name.toLowerCase(),
      ...z.name.toLowerCase().split(' '),
      z.city.toLowerCase(),
    ].filter(k => k.length > 3),
  }));
}

/** Returns the zone most likely targeted by the article, or null. */
function detectZone(text: string, zoneMap: ZoneKeywordMap[]): string | null {
  const lower = text.toLowerCase();
  for (const entry of zoneMap) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.zoneId;
    }
  }
  return null;
}

// ─── Article → ExternalSignal ────────────────────────────────────────────────

interface MatchedArticle {
  article:    NewsArticle;
  rule:       KeywordRule;
  matchedKws: string[];
  zoneId:     string;
}

function matchArticle(
  article: NewsArticle,
  rules: KeywordRule[],
  zoneMap: ZoneKeywordMap[],
  fallbackZoneId: string,
): MatchedArticle | null {
  const text = `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase();

  for (const rule of rules) {
    const matched = rule.keywords.filter(kw => text.includes(kw));
    if (matched.length === 0) continue;

    const zoneId = detectZone(text, zoneMap) ?? fallbackZoneId;

    return { article, rule, matchedKws: matched, zoneId };
  }
  return null;
}

function articleToSignal(match: MatchedArticle): ExternalSignal {
  const { article, rule, matchedKws, zoneId } = match;
  const id = `news-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    signal_type:       rule.signalType,
    zone_id:           zoneId,
    source:            'news',
    severity:          rule.severity,
    confidence:        matchedKws.length >= 2 ? 0.80 : 0.60,
    detected_keywords: matchedKws,
    title:             article.title?.slice(0, 120) ?? 'News signal',
    summary:
      (article.description?.slice(0, 200) ?? article.title?.slice(0, 200) ?? '') +
      ` [Source: ${article.source.name}]`,
    raw_payload: {
      url:         article.url,
      publishedAt: article.publishedAt,
      source:      article.source.name,
    },
    created_at: article.publishedAt ?? new Date().toISOString(),
  };
}

// ─── NewsAPI fetch ────────────────────────────────────────────────────────────

const SEARCH_QUERIES = [
  `${DEMO_CITY} flood`,
  `${DEMO_CITY} road closure`,
  `${DEMO_CITY} power outage`,
  `${DEMO_CITY} water supply`,
  `${DEMO_CITY} traffic`,
];

// News ingestion is possible when EITHER a proxy URL is configured (server-side
// key, browser-safe) OR a direct NewsAPI key is present (works on localhost /
// server runtimes only — browsers on public domains are blocked by CORS).
const NEWS_AVAILABLE = Boolean(NEWS_API_PROXY_URL || NEWS_API_KEY);

// True when the proxy points at a Supabase Edge Function, which requires the
// anon key in the Authorization header to pass the gateway's JWT check.
function isSupabaseFunctionUrl(url: string): boolean {
  return /\.supabase\.co\/functions\//.test(url) || /\/functions\/v1\//.test(url);
}

async function fetchNewsArticles(query: string): Promise<NewsArticle[]> {
  if (!NEWS_AVAILABLE) return [];

  const params = new URLSearchParams({
    q:        query,
    sortBy:   'publishedAt',
    pageSize: '10',
  });

  const headers: Record<string, string> = {};
  let requestUrl: string;

  if (NEWS_API_PROXY_URL) {
    // Proxy holds the API key server-side — never send it from the browser.
    requestUrl = `${NEWS_API_PROXY_URL}?${params.toString()}`;
    if (isSupabaseFunctionUrl(NEWS_API_PROXY_URL) && SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      headers.apikey = SUPABASE_ANON_KEY;
    }
  } else {
    // Direct call (localhost / server runtimes only).
    params.set('apiKey', NEWS_API_KEY);
    requestUrl = `https://newsapi.org/v2/everything?${params.toString()}`;
  }

  const res = await fetch(requestUrl, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);

  const json: NewsApiResponse = await res.json();
  if (json.status !== 'ok') throw new Error(`NewsAPI error: ${json.status}`);
  return json.articles ?? [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface NewsIngestionResult {
  signals:  ExternalSignal[];
  articles: number;
  matched:  number;
  source:   'live' | 'fallback';
  error?:   string;
}

/**
 * Fetches recent news, detects infrastructure keywords, maps to zones,
 * and returns normalised ExternalSignals.
 */
export async function ingestNewsSignals(
  zones: Zone[],
): Promise<NewsIngestionResult> {
  if (!NEWS_AVAILABLE) {
    // No demo leakage in live mode — just report unavailability with no signals.
    return {
      signals:  [],
      articles: 0,
      matched:  0,
      source:   'fallback',
      error:    'No NewsAPI key or proxy configured',
    };
  }

  const zoneMap       = buildZoneKeywords(zones);
  const fallbackZone  = zones[0]?.id ?? 'zone-01';

  try {
    // Run queries in parallel (max 3 at once to respect rate limits)
    const BATCH = 3;
    const allArticles: NewsArticle[] = [];

    for (let i = 0; i < SEARCH_QUERIES.length; i += BATCH) {
      const batchQueries = SEARCH_QUERIES.slice(i, i + BATCH);
      const results = await Promise.allSettled(batchQueries.map(fetchNewsArticles));
      for (const r of results) {
        if (r.status === 'fulfilled') allArticles.push(...r.value);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allArticles.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // Match articles against keyword rules
    const matched: MatchedArticle[] = [];
    for (const article of unique) {
      const m = matchArticle(article, KEYWORD_RULES, zoneMap, fallbackZone);
      if (m) matched.push(m);
    }

    const signals = matched.map(articleToSignal);

    // No matches this cycle — return empty (no demo leakage). The live dataset
    // simply doesn't grow from news this run.
    if (signals.length === 0) {
      return {
        signals:  [],
        articles: unique.length,
        matched:  0,
        source:   'live',
        error:    unique.length > 0 ? 'No relevant articles matched' : 'No articles returned',
      };
    }

    return { signals, articles: unique.length, matched: matched.length, source: 'live' };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'News fetch failed';
    return { signals: [], articles: 0, matched: 0, source: 'fallback', error };
  }
}
