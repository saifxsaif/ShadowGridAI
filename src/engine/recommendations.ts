// ShadowGrid AI — Recommendation Generator
// Produces prioritized, actionable recommendations from computed risk scores.
//
// MVP approach: rule-based generation. Each rule matches a risk condition and
// emits a recommendation with a calculated priority and expected impact.
//
// Rules are defined per category and threshold, ordered by urgency.
// Priority is computed from risk score + category urgency weight.
//
// TODO: Add ML-based recommendation ranking that learns from historical
//       action outcomes (which actions actually reduced risk scores most).

import type { Zone, RiskScore, Recommendation, RiskCategory, ActionType } from '@/types/types';

interface RecommendationRule {
  category: RiskCategory;
  minScore: number;
  urgency: Recommendation['urgency'];
  actionType: ActionType;
  title: string;
  buildDescription: (zone: Zone, score: RiskScore) => string;
  expectedImpact: (score: number) => number; // % risk reduction if completed
  // Optional: additional condition beyond minScore
  condition?: (zone: Zone, score: RiskScore) => boolean;
}

// Category urgency weight (higher = more urgent overall)
const CATEGORY_URGENCY_WEIGHT: Record<RiskCategory, number> = {
  emergency_access: 10,
  drainage:         9,
  power:            8,
  road:             7,
  traffic:          6,
  water:            5,
};

const RECOMMENDATION_RULES: RecommendationRule[] = [
  // EMERGENCY ACCESS — highest priority
  {
    category: 'emergency_access',
    minScore: 60,
    urgency: 'immediate',
    actionType: 'protect_hospital_access',
    title: 'Secure Emergency Access Corridor',
    buildDescription: (zone) =>
      `Deploy traffic management to all key entry/exit routes in ${zone.name}. ` +
      `Ensure ambulance and emergency vehicle paths remain clear. ` +
      (zone.infrastructure_notes?.includes('Hospital')
        ? 'Coordinate directly with hospital emergency department.'
        : 'Coordinate with adjacent zone traffic authorities.'),
    expectedImpact: (score) => Math.round(30 + (score - 60) * 0.4),
  },

  // DRAINAGE — immediate if critical
  {
    category: 'drainage',
    minScore: 75,
    urgency: 'immediate',
    actionType: 'dispatch_drainage_team',
    title: 'Deploy Drainage Response Team',
    buildDescription: (zone, score) =>
      `Immediately dispatch drainage crew to ${zone.name}. ` +
      `Clear blocked drains and restore flow capacity. ` +
      `Focus on lowest-elevation streets first. Risk score: ${score.score}.`,
    expectedImpact: (score) => Math.round(25 + (score - 75) * 0.5),
  },
  {
    category: 'drainage',
    minScore: 70,
    urgency: 'immediate',
    actionType: 'emergency_pump_deployment',
    title: 'Deploy Emergency Pumps',
    buildDescription: (zone) =>
      `Position mobile water pumps at flood-prone low points in ${zone.name}. ` +
      `Activate before water levels reach critical threshold.`,
    expectedImpact: () => 22,
    condition: (zone) => zone.flood_sensitivity > 60,
  },
  {
    category: 'drainage',
    minScore: 55,
    urgency: 'urgent',
    actionType: 'alert_residents',
    title: `Issue Flood Advisory`,
    buildDescription: (zone) =>
      `Issue public advisory to residents of ${zone.name}. ` +
      `Advise avoiding low-lying areas and preparation of flood barriers for ground-floor properties.`,
    expectedImpact: () => 12,
  },

  // POWER
  {
    category: 'power',
    minScore: 60,
    urgency: 'urgent',
    actionType: 'inspect_power_lines',
    title: 'Inspect Power Infrastructure',
    buildDescription: (zone, score) =>
      `Technical inspection of grid connection points and substations in ${zone.name}. ` +
      `Identify and isolate stress points before unplanned shutdown occurs. ` +
      `Power risk score: ${score.score}.`,
    expectedImpact: (score) => Math.round(20 + (score - 60) * 0.6),
  },

  // ROAD
  {
    category: 'road',
    minScore: 60,
    urgency: 'urgent',
    actionType: 'road_inspection',
    title: 'Road Surface Inspection',
    buildDescription: (zone) =>
      `Immediate inspection of road surfaces in ${zone.name}. ` +
      `Identify cracks, potholes, and water-weakened sections. Mark hazards and initiate repairs.`,
    expectedImpact: () => 18,
  },

  // TRAFFIC
  {
    category: 'traffic',
    minScore: 60,
    urgency: 'urgent',
    actionType: 'redirect_traffic',
    title: 'Activate Traffic Diversion',
    buildDescription: (zone) =>
      `Reroute traffic through bypass routes in ${zone.name}. ` +
      `Reduce gridlock pressure and maintain emergency vehicle corridor.`,
    expectedImpact: () => 20,
  },

  // WATER
  {
    category: 'water',
    minScore: 55,
    urgency: 'scheduled',
    actionType: 'water_supply_check',
    title: 'Inspect Water Supply Network',
    buildDescription: (zone) =>
      `Field inspection of water supply network in ${zone.name}. ` +
      `Identify aging pipes, pressure anomalies, and fracture risk points before failure.`,
    expectedImpact: () => 25,
  },
];

let recIdCounter = 1;

/**
 * Generates a prioritized list of recommendations from computed risk scores.
 * Higher-scoring and higher-urgency items get lower priority numbers (= higher in queue).
 */
export function generateRecommendations(
  zones: Zone[],
  riskScores: RiskScore[],
): Recommendation[] {
  const zoneById = new Map(zones.map(z => [z.id, z]));
  const candidates: Array<{ rec: Recommendation; priorityScore: number }> = [];

  for (const score of riskScores) {
    const zone = zoneById.get(score.zone_id);
    if (!zone) continue;

    for (const rule of RECOMMENDATION_RULES) {
      if (score.category !== rule.category) continue;
      if (score.score < rule.minScore) continue;
      if (rule.condition && !rule.condition(zone, score)) continue;

      const urgencyScore = rule.urgency === 'immediate' ? 100 : rule.urgency === 'urgent' ? 70 : 40;
      const priorityScore =
        score.score * 0.5
        + urgencyScore * 0.3
        + CATEGORY_URGENCY_WEIGHT[rule.category] * 2;

      candidates.push({
        priorityScore,
        rec: {
          id: `rec-gen-${recIdCounter++}-${zone.id}-${rule.actionType}`,
          zone_id: zone.id,
          category: rule.category,
          action_type: rule.actionType,
          title: rule.title,
          description: rule.buildDescription(zone, score),
          priority: 0, // assigned after sort
          urgency: rule.urgency,
          expected_impact_reduction: rule.expectedImpact(score.score),
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      });
    }
  }

  // Sort by priority score descending, deduplicate (same zone+action = keep highest)
  candidates.sort((a, b) => b.priorityScore - a.priorityScore);

  const seen = new Set<string>();
  const final: Recommendation[] = [];

  for (const { rec } of candidates) {
    const key = `${rec.zone_id}:${rec.action_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    final.push({ ...rec, priority: final.length + 1 });
    if (final.length >= 10) break; // cap at 10 recommendations
  }

  return final;
}
