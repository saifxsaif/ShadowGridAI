// ShadowGrid AI — Time Decay Module
// Reduces signal weight based on age. Recent events have full weight; older
// events are down-weighted so the risk model stays responsive to current conditions.
//
// Decay schedule (configurable):
//   < 2h   → 1.00 (full weight)
//   2–6h   → 0.85
//   6–12h  → 0.70
//   12–24h → 0.55
//   24–48h → 0.35
//   48h–7d → 0.20
//   > 7d   → 0.08
//
// TODO: Replace with exponential decay curve for smoother results
//       or connect to a configurable half-life per signal type.

const DECAY_BUCKETS: Array<{ maxAgeMs: number; weight: number }> = [
  { maxAgeMs: 2 * 3600 * 1000,        weight: 1.00 },
  { maxAgeMs: 6 * 3600 * 1000,        weight: 0.85 },
  { maxAgeMs: 12 * 3600 * 1000,       weight: 0.70 },
  { maxAgeMs: 24 * 3600 * 1000,       weight: 0.55 },
  { maxAgeMs: 48 * 3600 * 1000,       weight: 0.35 },
  { maxAgeMs: 7 * 24 * 3600 * 1000,   weight: 0.20 },
];
const DECAY_FLOOR = 0.08;

/**
 * Returns a multiplier in [0.08, 1.0] based on the age of the signal.
 * @param createdAt ISO timestamp string of the signal
 */
export function getDecayWeight(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  for (const bucket of DECAY_BUCKETS) {
    if (ageMs <= bucket.maxAgeMs) return bucket.weight;
  }
  return DECAY_FLOOR;
}

/**
 * Applies time decay to a raw score value.
 * @param rawScore 0–100
 * @param createdAt ISO timestamp
 */
export function decayScore(rawScore: number, createdAt: string): number {
  return rawScore * getDecayWeight(createdAt);
}
