// ShadowGrid AI — Risk Scoring Engine
// Computes per-category risk scores for each zone using a weighted multi-signal formula.
//
// Formula (per category):
//   score = clamp(0, 100,
//     0.30 × citizen_component
//   + 0.25 × weather_component
//   + 0.20 × signal_component
//   + 0.15 × historical_component
//   + 0.10 × propagation_component
//   )
//
// Components:
//   citizen_component    — from clustered, decay-weighted citizen reports
//   weather_component    — from external weather signals (decay-weighted)
//   signal_component     — from external news/sensor signals (decay-weighted)
//   historical_component — from zone's static historical_failure_rate + vulnerability
//   propagation_component — from adjacent zone risk (zone graph propagation)
//
// TODO: Add ML-based anomaly detection layer on top of the weighted formula.
//       Integrate live weather API data into weather_component.

import type {
  Zone, RiskScore, RiskLevel, RiskCategory,
  CitizenReport, ExternalSignal,
} from '@/types/types';
import { RISK_WEIGHTS } from '@/lib/constants';
import type { SignalCluster } from './signalCluster';
import { buildSignalClusters } from './signalCluster';
import {
  buildZoneGraph,
  computePropagationComponent,
  type ZoneGraph,
} from './zoneGraph';

const ALL_CATEGORIES: RiskCategory[] = [
  'drainage', 'road', 'water', 'power', 'traffic', 'emergency_access',
];

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'normal';
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

// Maps category → weather signal boost factor (some categories are more
// weather-sensitive than others)
const WEATHER_SENSITIVITY: Record<RiskCategory, number> = {
  drainage:         1.30,
  road:             0.90,
  water:            0.70,
  power:            0.80,
  traffic:          0.85,
  emergency_access: 1.00,
};

// Historical base per category using zone vulnerability metrics
function computeHistoricalComponent(zone: Zone, category: RiskCategory): number {
  const base = zone.historical_failure_rate;
  const vuln = zone.vulnerability_score;
  const flood = zone.flood_sensitivity;

  switch (category) {
    case 'drainage':
      return clamp((base * 0.5 + flood * 0.35 + vuln * 0.15));
    case 'road':
      return clamp((base * 0.5 + vuln * 0.35 + (100 - zone.elevation_m * 2) * 0.15));
    case 'water':
      return clamp((base * 0.4 + vuln * 0.4 + flood * 0.2));
    case 'power':
      return clamp((base * 0.5 + vuln * 0.35 + (zone.population_density === 'high' ? 15 : 0)));
    case 'traffic':
      return clamp((base * 0.3 + (zone.population_density === 'high' ? 30 : zone.population_density === 'medium' ? 15 : 5) + vuln * 0.25));
    case 'emergency_access':
      return clamp((base * 0.35 + vuln * 0.35 + flood * 0.15 + (zone.population_density === 'high' ? 15 : 0)));
    default:
      return clamp(base * 0.5);
  }
}

// Extract weather component from weather-sourced signals for this zone+category
function computeWeatherComponent(
  zoneId: string,
  category: RiskCategory,
  clusters: Map<string, SignalCluster>,
  externalSignals: ExternalSignal[],
): number {
  // Check if there's a weather cluster for this zone+category
  const clusterKey = `${zoneId}:${category}`;
  const cluster = clusters.get(clusterKey);

  // Also check raw weather signals from adjacent categories mapped via weather
  const weatherSignals = externalSignals.filter(
    s => s.zone_id === zoneId && s.source === 'weather'
  );

  const clusterScore = cluster?.weighted_influence ?? 0;
  const weatherBoost = weatherSignals.length > 0
    ? weatherSignals.reduce((sum, s) => sum + s.confidence * 80, 0) / weatherSignals.length
    : 0;

  const raw = (clusterScore * 0.6 + weatherBoost * 0.4) * WEATHER_SENSITIVITY[category];
  return clamp(raw);
}

// Extract citizen component from citizen report clusters
function computeCitizenComponent(
  zoneId: string,
  category: RiskCategory,
  clusters: Map<string, SignalCluster>,
): number {
  const key = `${zoneId}:${category}`;
  const cluster = clusters.get(key);
  if (!cluster) return 0;
  return clamp(cluster.weighted_influence);
}

// Extract signal component from external news/sensor signals
function computeSignalComponent(
  zoneId: string,
  category: RiskCategory,
  clusters: Map<string, SignalCluster>,
  externalSignals: ExternalSignal[],
): number {
  const key = `${zoneId}:${category}`;
  const cluster = clusters.get(key);

  const newsSigs = externalSignals.filter(
    s => s.zone_id === zoneId && (s.source === 'news' || s.source === 'sensor')
  );

  const clusterScore = cluster?.weighted_influence ?? 0;
  const newsBoost = newsSigs.length > 0
    ? newsSigs.reduce((sum, s) => sum + s.confidence * 70, 0) / newsSigs.length
    : 0;

  return clamp(clusterScore * 0.55 + newsBoost * 0.45);
}

export interface ScoringInputs {
  zones: Zone[];
  citizenReports: CitizenReport[];
  externalSignals: ExternalSignal[];
}

export interface ComputedRiskScore extends Omit<RiskScore, 'id'> {
  id: string;
}

/**
 * Main scoring entry point. Computes risk scores for all zones and categories.
 * Returns a flat array of RiskScore records ready for use in the UI.
 */
export function computeAllRiskScores(inputs: ScoringInputs): ComputedRiskScore[] {
  const { zones, citizenReports, externalSignals } = inputs;

  // Step 1 — Build signal clusters
  const clusters = buildSignalClusters(citizenReports, externalSignals);

  // Step 2 — Build zone graph
  const graph: ZoneGraph = buildZoneGraph(zones);
  const zoneById = new Map(zones.map(z => [z.id, z]));

  // Step 3 — First pass: compute non-propagation components for all zones/categories
  // We need this first pass to enable propagation in step 4
  const firstPassScores = new Map<string, Map<RiskCategory, number>>();

  for (const zone of zones) {
    const catMap = new Map<RiskCategory, number>();
    for (const category of ALL_CATEGORIES) {
      const citizen = computeCitizenComponent(zone.id, category, clusters);
      const weather = computeWeatherComponent(zone.id, category, clusters, externalSignals);
      const signal = computeSignalComponent(zone.id, category, clusters, externalSignals);
      const historical = computeHistoricalComponent(zone, category);

      // Intermediate score without propagation
      const partial = clamp(
        RISK_WEIGHTS.citizen * citizen
        + RISK_WEIGHTS.weather * weather
        + RISK_WEIGHTS.signal * signal
        + RISK_WEIGHTS.historical * historical
      );
      catMap.set(category, partial);
    }
    firstPassScores.set(zone.id, catMap);
  }

  // Step 4 — Second pass: add propagation component and finalize
  const results: ComputedRiskScore[] = [];
  let idCounter = 1;

  for (const zone of zones) {
    for (const category of ALL_CATEGORIES) {
      const citizen = computeCitizenComponent(zone.id, category, clusters);
      const weather = computeWeatherComponent(zone.id, category, clusters, externalSignals);
      const signal = computeSignalComponent(zone.id, category, clusters, externalSignals);
      const historical = computeHistoricalComponent(zone, category);
      const propagation = computePropagationComponent(zone.id, category, graph, firstPassScores);

      const score = clamp(
        RISK_WEIGHTS.citizen * citizen
        + RISK_WEIGHTS.weather * weather
        + RISK_WEIGHTS.signal * signal
        + RISK_WEIGHTS.historical * historical
        + RISK_WEIGHTS.propagation * propagation
      );

      const level = getRiskLevel(score);

      // Build a short explanation string
      const explanation = buildScoreExplanation(zone, category, {
        citizen, weather, signal, historical, propagation, score, level,
      }, graph, zoneById);

      results.push({
        id: `computed-${zone.id}-${category}-${idCounter++}`,
        zone_id: zone.id,
        category,
        score,
        risk_level: level,
        citizen_component: citizen,
        weather_component: weather,
        signal_component: signal,
        historical_component: historical,
        propagation_component: propagation,
        explanation,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return results;
}

function buildScoreExplanation(
  zone: Zone,
  category: RiskCategory,
  components: {
    citizen: number; weather: number; signal: number;
    historical: number; propagation: number;
    score: number; level: RiskLevel;
  },
  graph: ZoneGraph,
  zoneById: Map<string, Zone>,
): string {
  const parts: string[] = [];
  const { citizen, weather, signal, historical, propagation, score, level } = components;

  if (score === 0) return `No active signals for ${category} in ${zone.name}. Routine monitoring.`;

  parts.push(`${zone.name} ${category} risk is ${level} (score: ${score}).`);

  if (citizen > 40) {
    parts.push(`Citizen reports are a primary driver (${citizen}/100).`);
  } else if (citizen > 15) {
    parts.push(`${citizen > 25 ? 'Multiple' : 'Some'} citizen reports recorded.`);
  }

  if (weather > 50) {
    parts.push(`Weather signals are elevated (${weather}/100), indicating active hazard conditions.`);
  } else if (weather > 25) {
    parts.push(`Weather is a contributing factor.`);
  }

  if (signal > 40) {
    parts.push(`External intelligence signals (news/sensors) indicate active disruptions.`);
  }

  if (historical > 50) {
    parts.push(`Zone has a high historical failure rate for this category.`);
  }

  if (propagation > 30) {
    const adjacent = graph.get(zone.id) ?? new Set<string>();
    const adjNames = Array.from(adjacent)
      .map(id => zoneById.get(id)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(', ');
    parts.push(`Risk propagating from adjacent zone(s): ${adjNames || 'nearby zones'}.`);
  }

  return parts.join(' ');
}
