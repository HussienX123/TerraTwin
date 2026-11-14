// Browser-side weight normalization, overall (exploratory) recomputation,
// land-only percentile lookup, and colorblind-safe Viridis color mapping.

export const DEFAULT_WEIGHTS = { terrain: 0.4, environment: 0.3, mobility: 0.3 };

// Viridis stops (perceptually uniform, colorblind-safe)
const VIRIDIS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

export function normalizeWeights(raw) {
  const t = Math.max(0, Number(raw.terrain) || 0);
  const e = Math.max(0, Number(raw.environment) || 0);
  const m = Math.max(0, Number(raw.mobility) || 0);
  const sum = t + e + m;
  if (sum <= 0) {
    return { terrain: 1 / 3, environment: 1 / 3, mobility: 1 / 3 };
  }
  return { terrain: t / sum, environment: e / sum, mobility: m / sum };
}

export function computeOverall(cell, weights) {
  if (
    cell.is_water ||
    cell.terrain_score == null ||
    cell.environment_score == null ||
    cell.mobility_score == null
  ) {
    return null;
  }
  return (
    weights.terrain * cell.terrain_score +
    weights.environment * cell.environment_score +
    weights.mobility * cell.mobility_score
  );
}

/** Compute sorted land values for fast weak percentile lookups. */
export function buildSortedOverall(cells, weights) {
  const vals = [];
  for (let i = 0; i < cells.length; i += 1) {
    const v = computeOverall(cells[i], weights);
    if (v != null) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  return vals;
}

/** Weak percentile rank (0..100): fraction of sortedVals <= val. */
export function weakPercentile(sortedVals, val) {
  if (val == null || sortedVals.length === 0) return null;
  let lo = 0;
  let hi = sortedVals.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedVals[mid] <= val) lo = mid + 1;
    else hi = mid;
  }
  return (100 * lo) / sortedVals.length;
}

export function viridisColor(value0to100) {
  if (value0to100 == null || Number.isNaN(value0to100)) return "#cbd5e1";
  const t = Math.max(0, Math.min(1, value0to100 / 100));
  const scaled = t * (VIRIDIS.length - 1);
  const idx = Math.min(VIRIDIS.length - 2, Math.floor(scaled));
  const f = scaled - idx;
  const c0 = VIRIDIS[idx];
  const c1 = VIRIDIS[idx + 1];
  const r = Math.round(c0[0] + f * (c1[0] - c0[0]));
  const g = Math.round(c0[1] + f * (c1[1] - c0[1]));
  const b = Math.round(c0[2] + f * (c1[2] - c0[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

export function fmt(val, digits = 1) {
  if (val === null || val === undefined || Number.isNaN(val)) return "n/a";
  return Number(val).toFixed(digits);
}
