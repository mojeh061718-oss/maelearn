// BLUEPRINT §8 — trace scoring on three axes: coverage, direction, order.
// Never a hard fail: callers degrade to assisted-accept after two misses.

import type { Sample } from './input';

export interface GlyphStroke { points: [number, number][]; hint: string; }
export interface Glyph { id: string; label: string; strokes: GlyphStroke[]; }

export interface StrokeScore {
  coverage: number;      // 0..1 of target points with a sample within r
  directionOk: boolean;  // positive progress along arc-length
  pass: boolean;
}

export function scoreStroke(
  samples: Sample[],
  target: GlyphStroke,
  tolerance: number,          // radius r in logical units (§8: 56 → 32)
  coverageThreshold = 0.8,
): StrokeScore {
  const pts = target.points;
  if (samples.length < 2 || pts.length === 0) {
    return { coverage: 0, directionOk: false, pass: false };
  }
  const r2 = tolerance * tolerance;

  // Coverage: fraction of target points with a user sample within r.
  let covered = 0;
  for (const [tx, ty] of pts) {
    for (const s of samples) {
      const dx = s.x - tx, dy = s.y - ty;
      if (dx * dx + dy * dy <= r2) { covered++; break; }
    }
  }
  const coverage = covered / pts.length;

  // Direction: map each sample to nearest target index; fit slope over sample order.
  const idx: number[] = [];
  for (const s of samples) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = s.x - pts[i][0], dy = s.y - pts[i][1];
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    idx.push(best);
  }
  // least-squares slope of idx vs position
  const n = idx.length;
  const meanX = (n - 1) / 2;
  const meanY = idx.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - meanX) * (idx[i] - meanY); den += (i - meanX) ** 2; }
  const slope = den ? num / den : 0;
  const directionOk = slope > 0;

  return { coverage, directionOk, pass: coverage >= coverageThreshold && directionOk };
}

/** Tolerance ramp (§8): starts generous, tightens with difficulty 1..5. */
export function toleranceForDifficulty(d: number): number {
  return Math.round(56 - (d - 1) * 6); // 56, 50, 44, 38, 32
}
