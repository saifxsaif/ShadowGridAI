// ShadowGrid AI — Zone Graph & Risk Propagation Module
// Models the city as a connected graph of zones. Nearby zones can propagate
// risk to each other based on adjacency and category-specific weights.
//
// MVP approach: one-hop adjacency propagation. A zone's propagation_component
// is the max of (adjacent zone's category score × category propagation weight).
//
// TODO: Extend to multi-hop weighted propagation (BFS with decay per hop).
//       Add edge weights based on physical connectivity (road, pipe, grid).

import type { Zone, RiskCategory } from '@/types/types';

// How much each category propagates between adjacent zones (0–1)
// High values = categories that cascade across zone boundaries easily
export const PROPAGATION_WEIGHTS: Record<RiskCategory, number> = {
  drainage:         0.65, // floods spread easily to adjacent low-elevation areas
  road:             0.55, // road blockages propagate traffic to adjacent zones
  water:            0.45, // pipe failures can affect adjacent supply networks
  power:            0.60, // grid instability propagates through interconnected circuits
  traffic:          0.70, // congestion spills over into adjacent zones quickly
  emergency_access: 0.80, // access risk is highly sensitive to adjacency
};

export type ZoneGraph = Map<string, Set<string>>; // zoneId → set of adjacent zone IDs

/**
 * Builds an undirected adjacency map from the zones array.
 * Uses zone.adjacent_zone_ids as the source of truth.
 */
export function buildZoneGraph(zones: Zone[]): ZoneGraph {
  const graph: ZoneGraph = new Map();

  for (const zone of zones) {
    if (!graph.has(zone.id)) graph.set(zone.id, new Set());
    for (const adjId of zone.adjacent_zone_ids) {
      graph.get(zone.id)!.add(adjId);
      // Ensure bidirectional edges
      if (!graph.has(adjId)) graph.set(adjId, new Set());
      graph.get(adjId)!.add(zone.id);
    }
  }

  return graph;
}

/**
 * Computes the propagation component score for a given zone and category.
 * Takes the maximum propagated score from any adjacent zone, applying the
 * category-specific propagation weight.
 *
 * @param zoneId       The zone being scored
 * @param category     The risk category
 * @param graph        Prebuilt zone adjacency graph
 * @param categoryScores Map of (zoneId → (category → score)) for all zones
 * @returns Propagation component score in [0, 100]
 */
export function computePropagationComponent(
  zoneId: string,
  category: RiskCategory,
  graph: ZoneGraph,
  categoryScores: Map<string, Map<RiskCategory, number>>,
): number {
  const adjacent = graph.get(zoneId) ?? new Set<string>();
  const weight = PROPAGATION_WEIGHTS[category];
  let maxPropagated = 0;

  for (const adjId of adjacent) {
    const adjScores = categoryScores.get(adjId);
    if (!adjScores) continue;
    const adjScore = adjScores.get(category) ?? 0;
    const propagated = adjScore * weight;
    if (propagated > maxPropagated) maxPropagated = propagated;
  }

  return Math.min(100, Math.round(maxPropagated));
}

/**
 * Returns the IDs and names of zones adjacent to the given zone.
 */
export function getAdjacentZoneInfo(
  zoneId: string,
  graph: ZoneGraph,
  zoneById: Map<string, Zone>,
): Array<{ id: string; name: string }> {
  const adjacent = graph.get(zoneId) ?? new Set<string>();
  return Array.from(adjacent)
    .map(id => zoneById.get(id))
    .filter((z): z is Zone => z !== undefined)
    .map(z => ({ id: z.id, name: z.name }));
}
