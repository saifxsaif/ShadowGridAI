// ShadowGrid AI — Team Allocation Optimizer
// Assigns available maintenance teams to zones based on risk scores and
// category-specific team type requirements.
//
// MVP approach: greedy algorithm — sort zones by overall risk descending,
// then allocate teams proportionally to risk score, rounding to whole teams.
// Each high-risk category in a zone may generate a separate allocation entry.
//
// TODO: Upgrade to ILP (Integer Linear Programming) solver for true optimization
//       considering travel distance, team specializations, and shift constraints.

import type { Zone, RiskScore, TeamAllocation, RiskCategory } from '@/types/types';

// Maps risk categories to appropriate team types
const CATEGORY_TO_TEAM_TYPE: Record<RiskCategory, string> = {
  drainage:         'Drainage Response',
  road:             'Road Maintenance',
  water:            'Water Supply',
  power:            'Electrical Engineering',
  traffic:          'Traffic Management',
  emergency_access: 'Emergency Coordination',
};

// Minimum score to trigger a team allocation for a category
const ALLOCATION_THRESHOLD = 50;

// Maximum teams assignable to a single zone/category (prevents monopolization)
const MAX_TEAMS_PER_ZONE = 4;

interface ZoneSummaryForAllocation {
  zone: Zone;
  overallScore: number;
  topCategories: Array<{ category: RiskCategory; score: number }>;
}

/**
 * Computes a greedy team allocation plan given a pool of available teams.
 *
 * @param zones All city zones
 * @param riskScores Computed risk scores (all zones, all categories)
 * @param availableTeams Total teams available to deploy
 */
export function allocateTeams(
  zones: Zone[],
  riskScores: RiskScore[],
  availableTeams: number,
): TeamAllocation[] {
  if (availableTeams <= 0) return [];

  // Build per-zone summaries
  const summaries: ZoneSummaryForAllocation[] = zones.map(zone => {
    const zoneScores = riskScores.filter(rs => rs.zone_id === zone.id);
    const overallScore = zoneScores.length > 0
      ? Math.round(zoneScores.reduce((s, rs) => s + rs.score, 0) / zoneScores.length)
      : 0;

    const topCategories = zoneScores
      .filter(rs => rs.score >= ALLOCATION_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2) // top 2 categories per zone
      .map(rs => ({ category: rs.category, score: rs.score }));

    return { zone, overallScore, topCategories };
  });

  // Filter to zones with at least one qualifying category
  const eligible = summaries
    .filter(s => s.topCategories.length > 0)
    .sort((a, b) => b.overallScore - a.overallScore);

  if (eligible.length === 0) return [];

  // Total risk weight for proportional allocation
  const totalWeight = eligible.reduce((s, e) => s + e.overallScore, 0);
  let remaining = availableTeams;
  const allocations: TeamAllocation[] = [];
  let priorityRank = 1;

  for (const entry of eligible) {
    if (remaining <= 0) break;

    // Proportional allocation based on risk weight
    const rawAlloc = (entry.overallScore / totalWeight) * availableTeams;
    const teamCount = Math.min(MAX_TEAMS_PER_ZONE, Math.max(1, Math.round(rawAlloc)));
    const actual = Math.min(teamCount, remaining);

    const primaryCategory = entry.topCategories[0];
    const teamType = CATEGORY_TO_TEAM_TYPE[primaryCategory.category];
    const expectedReduction = Math.round(primaryCategory.score * 0.35);

    const notes = buildDeploymentNotes(entry.zone, primaryCategory.category, primaryCategory.score);

    allocations.push({
      id: `alloc-${entry.zone.id}-${primaryCategory.category}`,
      zone_id: entry.zone.id,
      team_type: teamType,
      team_count: actual,
      priority_rank: priorityRank++,
      expected_risk_reduction: expectedReduction,
      deployment_notes: notes,
      status: entry.overallScore >= 70 ? 'deployed' : 'planned',
      created_at: new Date().toISOString(),
    });

    remaining -= actual;
  }

  return allocations;
}

function buildDeploymentNotes(
  zone: Zone,
  category: RiskCategory,
  score: number,
): string {
  const prefix = `${zone.name} — ${category} risk at ${score}.`;

  switch (category) {
    case 'drainage':
      return `${prefix} Focus on low-elevation drainage points${zone.flood_sensitivity > 70 ? ' (high flood sensitivity zone)' : ''}.`;
    case 'road':
      return `${prefix} Inspect and repair critical road sections. Mark hazards.`;
    case 'water':
      return `${prefix} Inspect pipe network and pressure regulators.`;
    case 'power':
      return `${prefix} Inspect substation and grid connection points.`;
    case 'traffic':
      return `${prefix} Deploy traffic officers at key intersections. Activate bypass routing.`;
    case 'emergency_access':
      return `${prefix} Secure all emergency vehicle corridors${zone.infrastructure_notes?.includes('Hospital') ? '. Priority: hospital access.' : '.'}.`;
    default:
      return prefix;
  }
}
