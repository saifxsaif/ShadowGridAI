// ShadowGrid AI — Failure Chain Generator
// Generates readable failure chain scenarios based on active high-risk scores
// and zone conditions. Each chain shows how one trigger event cascades through
// infrastructure categories and city zones.
//
// MVP approach: rule-based pattern matching on risk scores.
// Chains are triggered when category scores exceed defined thresholds.
//
// TODO: Replace with graph-traversal simulation (BFS on zone graph + category edges)
//       to generate emergent chains from actual computed state.

import type {
  Zone, RiskScore, FailureChain, FailureChainStep, RiskCategory,
} from '@/types/types';

interface ChainTemplate {
  id: string;
  title: string;
  triggerCategory: RiskCategory;
  triggerMinScore: number;
  triggerZoneCheck?: (zone: Zone) => boolean;
  buildSteps: (zone: Zone, scores: RiskScore[], allZones: Zone[]) => FailureChainStep[];
}

const CHAIN_TEMPLATES: ChainTemplate[] = [
  // Drainage → Road → Traffic → Emergency Access
  {
    id: 'storm-cascade',
    title: 'Storm → Emergency Access Failure',
    triggerCategory: 'drainage',
    triggerMinScore: 65,
    triggerZoneCheck: (zone) => zone.flood_sensitivity > 60,
    buildSteps: (zone, scores, allZones) => {
      const roadScore = scores.find(s => s.zone_id === zone.id && s.category === 'road');
      const trafficScore = scores.find(s => s.zone_id === zone.id && s.category === 'traffic');
      const drainageScore = scores.find(s => s.zone_id === zone.id && s.category === 'drainage');

      // Find adjacent zones for propagation steps
      const adjZoneIds = zone.adjacent_zone_ids.slice(0, 2);
      const adjZones = allZones.filter(z => adjZoneIds.includes(z.id));
      const busyAdj = adjZones.find(z => z.population_density === 'high') ?? adjZones[0];

      const steps: FailureChainStep[] = [
        {
          step: 1,
          event: 'Heavy Rainfall Event',
          description: `Rainfall exceeds drainage capacity in ${zone.name}. ${Math.round((drainageScore?.score ?? 70))}mm/6h storm threshold breached.`,
          affected_zone_ids: [zone.id],
          category: 'drainage',
          probability: 0.94,
        },
        {
          step: 2,
          event: 'Drainage System Overflow',
          description: `${zone.name} drainage network overwhelmed. Streets flooding near low-elevation points.`,
          affected_zone_ids: [zone.id],
          category: 'drainage',
          probability: 0.87,
        },
        {
          step: 3,
          event: 'Road Blockage',
          description: `Flooded roads block arterial routes through ${zone.name}.${roadScore && roadScore.score > 50 ? ` Road risk elevated to ${roadScore.score}.` : ''}`,
          affected_zone_ids: [zone.id, ...(busyAdj ? [busyAdj.id] : [])],
          category: 'road',
          probability: 0.78,
        },
        {
          step: 4,
          event: 'Traffic Cascade',
          description: `Blocked routes create gridlock.${trafficScore && trafficScore.score > 40 ? ` Traffic risk: ${trafficScore.score}.` : ''} Diversions overwhelm adjacent zone network.`,
          affected_zone_ids: adjZoneIds.length > 0 ? adjZoneIds : [zone.id],
          category: 'traffic',
          probability: 0.71,
        },
        {
          step: 5,
          event: 'Emergency Access Failure',
          description: `Emergency vehicles delayed. Gridlock prevents timely response to incidents.${zone.infrastructure_notes?.includes('Hospital') ? ' Hospital access corridor at critical risk.' : ''}`,
          affected_zone_ids: [zone.id, ...adjZoneIds],
          category: 'emergency_access',
          probability: 0.62,
        },
      ];
      return steps;
    },
  },

  // Power → Traffic signals → Congestion
  {
    id: 'power-cascade',
    title: 'Substation Failure → Power Cascade',
    triggerCategory: 'power',
    triggerMinScore: 55,
    buildSteps: (zone, scores, allZones) => {
      const adjZoneIds = zone.adjacent_zone_ids.slice(0, 2);
      const adjZones = allZones.filter(z => adjZoneIds.includes(z.id));

      const steps: FailureChainStep[] = [
        {
          step: 1,
          event: 'Power Grid Instability',
          description: `${zone.name} power infrastructure showing stress. Substation operating above stable load thresholds.`,
          affected_zone_ids: [zone.id],
          category: 'power',
          probability: 0.85,
        },
        {
          step: 2,
          event: 'Localized Outage',
          description: `Rolling power cuts begin in ${zone.name}. Commercial and residential supply interrupted intermittently.`,
          affected_zone_ids: [zone.id],
          category: 'power',
          probability: 0.75,
        },
        {
          step: 3,
          event: 'Traffic Signal Failure',
          description: `Traffic signals lose power across ${zone.name}. Intersections operating on emergency protocol or failing dark.`,
          affected_zone_ids: [zone.id, ...adjZones.slice(0, 1).map(z => z.id)],
          category: 'traffic',
          probability: 0.68,
        },
        {
          step: 4,
          event: 'Congestion & Access Risk',
          description: `Signal-less intersections cause gridlock. Emergency vehicle response times increase significantly.`,
          affected_zone_ids: adjZoneIds.length > 0 ? adjZoneIds : [zone.id],
          category: 'emergency_access',
          probability: 0.58,
        },
      ];
      return steps;
    },
  },

  // Water pressure → supply failure → service disruption
  {
    id: 'water-cascade',
    title: 'Water Pressure Drop → Supply Failure',
    triggerCategory: 'water',
    triggerMinScore: 55,
    buildSteps: (zone, _scores, allZones) => {
      const adjZoneIds = zone.adjacent_zone_ids.slice(0, 1);

      const steps: FailureChainStep[] = [
        {
          step: 1,
          event: 'Water Pressure Anomaly',
          description: `${zone.name} water supply network showing pressure irregularities. Multiple low-pressure complaints received.`,
          affected_zone_ids: [zone.id],
          category: 'water',
          probability: 0.90,
        },
        {
          step: 2,
          event: 'Pipe Stress & Fracture Risk',
          description: `Aging infrastructure under pressure differential. Risk of pipe burst at identified weak points.`,
          affected_zone_ids: [zone.id],
          category: 'water',
          probability: 0.72,
        },
        {
          step: 3,
          event: 'Supply Disruption',
          description: `Water supply interrupted to residential and commercial buildings. Fire hydrant pressure inadequate.`,
          affected_zone_ids: [zone.id, ...adjZoneIds],
          category: 'water',
          probability: 0.60,
        },
        {
          step: 4,
          event: 'Emergency Service Impact',
          description: `Fire suppression capacity reduced. Emergency services coordination required.`,
          affected_zone_ids: [zone.id],
          category: 'emergency_access',
          probability: 0.48,
        },
      ];
      return steps;
    },
  },
];

/**
 * Generates active failure chains from computed risk scores and zone data.
 * Only generates chains where the trigger condition is met.
 */
export function generateFailureChains(
  zones: Zone[],
  riskScores: RiskScore[],
): FailureChain[] {
  const chains: FailureChain[] = [];

  for (const zone of zones) {
    for (const template of CHAIN_TEMPLATES) {
      const triggerScore = riskScores.find(
        rs => rs.zone_id === zone.id && rs.category === template.triggerCategory
      );

      if (!triggerScore || triggerScore.score < template.triggerMinScore) continue;
      if (template.triggerZoneCheck && !template.triggerZoneCheck(zone)) continue;

      const steps = template.buildSteps(zone, riskScores, zones);

      // Overall risk level based on trigger score
      const overallLevel =
        triggerScore.score >= 80 ? 'critical' :
        triggerScore.score >= 60 ? 'high' :
        'medium';

      chains.push({
        id: `${template.id}-${zone.id}`,
        title: template.title,
        trigger: `Trigger: ${zone.name} (${template.triggerCategory} score: ${triggerScore.score})`,
        trigger_zone_id: zone.id,
        steps,
        overall_risk_level: overallLevel,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Sort by severity: critical first, then by trigger score descending
  chains.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, normal: 4 };
    return (order[a.overall_risk_level] - order[b.overall_risk_level]);
  });

  return chains.slice(0, 4); // Cap at 4 most relevant chains for dashboard
}
