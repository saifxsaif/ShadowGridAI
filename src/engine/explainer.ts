// ShadowGrid AI — Zone Risk Explainer
// Generates a human-readable narrative explanation for a zone's overall risk
// state, suitable for display in the Zone Details page and hover tooltips.
//
// Takes the zone's computed risk scores + raw signals and produces:
//   1. A primary risk statement
//   2. Driving factors — now mentions citizen reports, weather, and news sources
//   3. Propagation context (if relevant)
//   4. Recommended watch points
//   5. Top recommendation action
//
// TODO: Connect to LLM for richer, context-aware natural language generation.

import type { Zone, RiskScore, RiskCategory, ExternalSignal, CitizenReport } from '@/types/types';
import { RISK_CATEGORY_LABELS } from '@/lib/constants';
import { getAdjacentZoneInfo, buildZoneGraph } from './zoneGraph';

const RISK_LEVEL_PHRASES: Record<string, string> = {
  critical: 'at critical risk',
  high:     'at elevated risk',
  medium:   'showing moderate risk',
  low:      'at low risk',
  normal:   'within normal parameters',
};

export interface ZoneExplanation {
  summary: string;
  primaryRisk: {
    category: RiskCategory;
    score: number;
    driverSentence: string;
  } | null;
  contributingFactors: string[];
  signalSources: string[];       // NEW: names the actual data sources driving the score
  propagationNote: string | null;
  watchPoints: string[];
  topRecommendation: string | null; // NEW: plain-text top action for this zone
}

/**
 * Generates a structured explanation for a zone's risk state.
 * Accepts optional raw signals and citizen reports to enrich source attribution.
 */
export function explainZoneRisk(
  zone: Zone,
  riskScores: RiskScore[],
  allZones: Zone[],
  options?: {
    citizenReports?: CitizenReport[];
    externalSignals?: ExternalSignal[];
  },
): ZoneExplanation {
  const zoneScores = riskScores
    .filter(rs => rs.zone_id === zone.id)
    .sort((a, b) => b.score - a.score);

  if (zoneScores.length === 0) {
    return {
      summary: `${zone.name} has no active risk signals. Infrastructure is operating normally.`,
      primaryRisk: null,
      contributingFactors: [],
      signalSources: [],
      propagationNote: null,
      watchPoints: ['Continue routine monitoring.'],
      topRecommendation: null,
    };
  }

  const overallScore = Math.round(zoneScores.reduce((s, rs) => s + rs.score, 0) / zoneScores.length);
  const overallLevel = scoreToLevel(overallScore);
  const topScore = zoneScores[0];
  const topCategoryLabel = RISK_CATEGORY_LABELS[topScore.category];

  // Summary sentence
  const summary =
    `${zone.name} is ${RISK_LEVEL_PHRASES[overallLevel]} (overall: ${overallScore}/100). ` +
    `The most urgent concern is ${topCategoryLabel.toLowerCase()} (${topScore.score}/100).`;

  // Primary risk driver sentence
  const driverSentence = buildDriverSentence(topScore, zone);

  // Contributing factors (top 3 by score)
  const factors: string[] = [];
  for (const rs of zoneScores.slice(0, 3)) {
    if (rs.score < 25) continue;
    const parts: string[] = [];
    if (rs.citizen_component > 30) parts.push(`${Math.round(rs.citizen_component)} from citizen reports`);
    if (rs.weather_component > 30) parts.push(`${Math.round(rs.weather_component)} from weather data`);
    if (rs.signal_component > 30) parts.push(`${Math.round(rs.signal_component)} from public signals`);
    if (rs.historical_component > 40) parts.push('elevated historical vulnerability');
    if (parts.length > 0) {
      factors.push(`${RISK_CATEGORY_LABELS[rs.category]}: ${parts.join('; ')}.`);
    }
  }

  // Signal source attribution — names the actual data inputs
  const signalSources = buildSignalSourceLines(zone, zoneScores, options);

  // Propagation note
  const highPropagators = zoneScores.filter(rs => rs.propagation_component > 35);
  let propagationNote: string | null = null;
  if (highPropagators.length > 0) {
    const graph = buildZoneGraph(allZones);
    const zoneById = new Map(allZones.map(z => [z.id, z]));
    const adjInfo = getAdjacentZoneInfo(zone.id, graph, zoneById);
    if (adjInfo.length > 0) {
      const names = adjInfo.map(z => z.name).slice(0, 2).join(' and ');
      propagationNote =
        `Risk is amplified by conditions in adjacent zones: ${names}. ` +
        `Propagation is contributing to ${highPropagators.map(rs => RISK_CATEGORY_LABELS[rs.category].toLowerCase()).join(', ')} scores.`;
    }
  }

  // Watch points
  const watchPoints: string[] = generateWatchPoints(zone, zoneScores);

  // Top recommendation
  const topRecommendation = buildTopRecommendation(topScore, zone);

  return {
    summary,
    primaryRisk: {
      category: topScore.category,
      score: topScore.score,
      driverSentence,
    },
    contributingFactors: factors,
    signalSources,
    propagationNote,
    watchPoints,
    topRecommendation,
  };
}

// ─── Signal source attribution ────────────────────────────────────────────────

function buildSignalSourceLines(
  zone: Zone,
  scores: RiskScore[],
  options?: { citizenReports?: CitizenReport[]; externalSignals?: ExternalSignal[] },
): string[] {
  const lines: string[] = [];

  const reports = (options?.citizenReports ?? []).filter(r => r.zone_id === zone.id);
  const signals = (options?.externalSignals ?? []).filter(s => s.zone_id === zone.id);

  if (reports.length > 0) {
    const critical = reports.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    lines.push(
      `${reports.length} citizen report${reports.length > 1 ? 's' : ''}` +
      (critical > 0 ? ` (${critical} high/critical severity)` : '') +
      ' via community submissions.'
    );
  }

  const weatherSigs = signals.filter(s => s.source === 'weather');
  if (weatherSigs.length > 0) {
    const top = weatherSigs.sort((a, b) => b.confidence - a.confidence)[0];
    lines.push(`Live weather: ${top.title} (confidence ${Math.round(top.confidence * 100)}%).`);
  } else {
    const hasWeatherComponent = scores.some(rs => rs.weather_component > 20);
    if (hasWeatherComponent) lines.push('Weather data: using seeded baseline conditions.');
  }

  const newsSigs = signals.filter(s => s.source === 'news');
  if (newsSigs.length > 0) {
    const kws = [...new Set(newsSigs.flatMap(s => s.detected_keywords))].slice(0, 3);
    lines.push(`News signals (${newsSigs.length}): keywords detected — ${kws.join(', ')}.`);
  }

  const seededSigs = signals.filter(s => s.source === 'seeded');
  if (seededSigs.length > 0 && weatherSigs.length === 0 && newsSigs.length === 0) {
    lines.push(`${seededSigs.length} seeded demo signal${seededSigs.length > 1 ? 's' : ''} (fallback mode).`);
  }

  if (lines.length === 0) {
    lines.push('No active external signals. Score derived from historical baseline.');
  }

  return lines;
}

// ─── Driver sentence ──────────────────────────────────────────────────────────

function buildDriverSentence(rs: RiskScore, zone: Zone): string {
  const lvl = rs.risk_level;
  const cat = RISK_CATEGORY_LABELS[rs.category].toLowerCase();

  // Identify the dominant component to mention the source
  const components = [
    { name: 'citizen reports', val: rs.citizen_component },
    { name: 'weather data', val: rs.weather_component },
    { name: 'public signals', val: rs.signal_component },
    { name: 'historical baseline', val: rs.historical_component },
    { name: 'zone propagation', val: rs.propagation_component },
  ];
  const dominant = components.sort((a, b) => b.val - a.val)[0];
  const sourceClause = dominant.val > 25 ? ` — primary driver: ${dominant.name}` : '';

  if (lvl === 'critical') {
    return `${zone.name} faces a critical ${cat} situation requiring immediate intervention${sourceClause}.`;
  }
  if (lvl === 'high') {
    return `${zone.name} ${cat} risk is elevated — proactive response is recommended${sourceClause}.`;
  }
  if (lvl === 'medium') {
    return `${zone.name} ${cat} risk is moderate. Monitor and prepare response teams${sourceClause}.`;
  }
  return `${zone.name} ${cat} risk is within manageable range${sourceClause}.`;
}

// ─── Top recommendation ───────────────────────────────────────────────────────

function buildTopRecommendation(topScore: RiskScore, zone: Zone): string | null {
  if (topScore.score < 20) return null;
  const cat = topScore.category;
  const name = zone.name;

  const map: Record<RiskCategory, string> = {
    drainage:         `Dispatch drainage inspection team to ${name} — check outfall gates and pump stations.`,
    road:             `Schedule road surface inspection in ${name} and flag high-risk segments for closure review.`,
    water:            `Verify water supply pressure in ${name}; contact utility provider if below threshold.`,
    power:            `Alert power grid operator for ${name}; prepare mobile generator standby.`,
    traffic:          `Activate traffic diversion plan for ${name}; notify transit authority.`,
    emergency_access: `Confirm emergency vehicle access routes in ${name} remain unobstructed.`,
  };

  return map[cat] ?? null;
}

// ─── Watch points ─────────────────────────────────────────────────────────────

function generateWatchPoints(zone: Zone, scores: RiskScore[]): string[] {
  const points: string[] = [];

  const highScores = scores.filter(rs => rs.score >= 60);
  for (const rs of highScores.slice(0, 2)) {
    switch (rs.category) {
      case 'drainage':
        if (zone.flood_sensitivity > 70)
          points.push('Monitor low-elevation drainage exits continuously.');
        else
          points.push('Track drainage flow rates at primary outfall points.');
        break;
      case 'emergency_access':
        points.push('Verify ambulance route availability every 30 minutes.');
        break;
      case 'power':
        points.push('Log substation load readings hourly until score falls below 50.');
        break;
      case 'water':
        points.push('Check pressure readings at main distribution nodes.');
        break;
      case 'traffic':
        points.push('Monitor intersection throughput at peak hours.');
        break;
      case 'road':
        points.push('Conduct visual inspection of high-traffic road segments.');
        break;
    }
  }

  if (points.length === 0) {
    points.push('Continue routine monitoring. No immediate action required.');
  }

  return points;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToLevel(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'normal';
}
