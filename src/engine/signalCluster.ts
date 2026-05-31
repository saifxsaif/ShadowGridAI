// ShadowGrid AI — Signal Clustering / Deduplication Module
// Groups citizen reports and external signals by (zone, category, time window)
// to avoid inflating risk scores from duplicate or near-duplicate events.
//
// MVP approach: simple bucket grouping by zone + category within a time window.
// Returns a cluster summary per (zoneId, category) with count, max severity,
// latest timestamp, and a decay-weighted influence score.
//
// TODO: Upgrade to geospatial DBSCAN-style clustering using lat/lng coordinates
//       when precise location data is available per report.

import type { CitizenReport, ExternalSignal, RiskCategory, Severity } from '@/types/types';
import { REPORT_TYPE_TO_CATEGORY } from '@/lib/constants';
import { decayScore } from './timeDecay';

export interface SignalCluster {
  zone_id: string;
  category: RiskCategory;
  count: number;
  max_severity: Severity;
  latest_at: string;
  // Decay-weighted influence score (0-100) representing the cluster's impact
  weighted_influence: number;
}

// Raw severity → numeric weight for influence calculation
const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 100,
  high:     75,
  medium:   50,
  low:      25,
};

const CLUSTER_WINDOW_MS = 12 * 3600 * 1000; // 12-hour clustering window

/**
 * Builds a map of signal clusters from citizen reports and external signals.
 * Key: `${zoneId}:${category}`
 */
export function buildSignalClusters(
  citizenReports: CitizenReport[],
  externalSignals: ExternalSignal[],
): Map<string, SignalCluster> {
  const clusters = new Map<string, SignalCluster>();
  const now = Date.now();

  // Process citizen reports
  for (const report of citizenReports) {
    const ageMs = now - new Date(report.created_at).getTime();
    if (ageMs > CLUSTER_WINDOW_MS * 14) continue; // ignore very stale (>7d) reports

    const category = REPORT_TYPE_TO_CATEGORY[report.report_type];
    const key = `${report.zone_id}:${category}`;
    const rawScore = SEVERITY_WEIGHT[report.severity];
    const decayed = decayScore(rawScore, report.created_at);

    upsertCluster(clusters, key, report.zone_id, category, report.severity, report.created_at, decayed);
  }

  // Process external signals — map signal severity to category using signal_type heuristics
  for (const signal of externalSignals) {
    const ageMs = now - new Date(signal.created_at).getTime();
    if (ageMs > CLUSTER_WINDOW_MS * 14) continue;

    const category = inferCategoryFromSignal(signal.signal_type);
    if (!category) continue;

    const key = `${signal.zone_id}:${category}`;
    const rawScore = SEVERITY_WEIGHT[signal.severity] * signal.confidence;
    const decayed = decayScore(rawScore, signal.created_at);

    upsertCluster(clusters, key, signal.zone_id, category, signal.severity, signal.created_at, decayed);
  }

  return clusters;
}

function upsertCluster(
  clusters: Map<string, SignalCluster>,
  key: string,
  zoneId: string,
  category: RiskCategory,
  severity: Severity,
  createdAt: string,
  influence: number,
) {
  const existing = clusters.get(key);
  if (!existing) {
    clusters.set(key, {
      zone_id: zoneId,
      category,
      count: 1,
      max_severity: severity,
      latest_at: createdAt,
      weighted_influence: Math.min(100, influence),
    });
  } else {
    const severityRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    clusters.set(key, {
      ...existing,
      count: existing.count + 1,
      // Additive influence (capped at 100), scaled down to avoid double-counting:
      // each additional signal adds 70% of its influence value
      weighted_influence: Math.min(100, existing.weighted_influence + influence * 0.70),
      max_severity: severityRank[severity] > severityRank[existing.max_severity]
        ? severity
        : existing.max_severity,
      latest_at: new Date(createdAt) > new Date(existing.latest_at)
        ? createdAt
        : existing.latest_at,
    });
  }
}

// Maps signal types to risk categories
import type { SignalType } from '@/types/types';

const SIGNAL_TYPE_TO_CATEGORY: Partial<Record<SignalType, RiskCategory>> = {
  heavy_rainfall:          'drainage',
  weather_alert:           'drainage',
  news_flooding:           'drainage',
  news_road_closure:       'road',
  news_power_outage:       'power',
  news_water_shortage:     'water',
  news_traffic_disruption: 'traffic',
  seeded_incident:         'emergency_access',
};

export function inferCategoryFromSignal(signalType: SignalType): RiskCategory | null {
  return SIGNAL_TYPE_TO_CATEGORY[signalType] ?? null;
}
