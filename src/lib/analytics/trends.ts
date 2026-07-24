/**
 * Trend detection — SPEC §13.5.
 *
 * Ordinary least-squares linear regression of bucketed revenue against bucket
 * index:
 *   slope     = Σ((xᵢ − x̄)(yᵢ − ȳ)) / Σ((xᵢ − x̄)²)
 *   trend_pct = (slope × bucketCount) / mean(y) × 100
 *
 * Regression is used rather than first-vs-last comparison because a single
 * anomalous week would otherwise dominate the result (§13.5).
 */

import type { TrendLabel, TrendResult } from "@/types/analytics";

/** §13.5 — ≥4 non-empty buckets required, else the trend is "insufficient". */
export const MIN_TREND_BUCKETS = 4;
export const GROWING_THRESHOLD = 15;
export const DECLINING_THRESHOLD = -15;

export function classifyTrend(pct: number | null): TrendLabel {
  if (pct === null) return "insufficient";
  if (pct >= GROWING_THRESHOLD) return "growing";
  if (pct <= DECLINING_THRESHOLD) return "declining";
  return "stable";
}

/**
 * Compute trend_pct for a bucketed series. Empty buckets participate in the
 * regression as zeros (they are real gaps), but at least MIN_TREND_BUCKETS
 * buckets must be non-empty for the result to be meaningful.
 */
export function computeTrend(series: number[]): TrendResult {
  const nonEmptyBuckets = series.filter((v) => v !== 0).length;
  const n = series.length;

  if (n < 2 || nonEmptyBuckets < MIN_TREND_BUCKETS) {
    return { pct: null, label: "insufficient", nonEmptyBuckets };
  }

  const mean = series.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return { pct: null, label: "insufficient", nonEmptyBuckets };

  const xbar = (n - 1) / 2;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xbar) * (series[i] - mean);
    den += (i - xbar) ** 2;
  }
  if (den === 0) return { pct: null, label: "insufficient", nonEmptyBuckets };

  const slope = num / den;
  const pct = ((slope * n) / mean) * 100;
  if (!Number.isFinite(pct)) {
    return { pct: null, label: "insufficient", nonEmptyBuckets };
  }
  return { pct, label: classifyTrend(pct), nonEmptyBuckets };
}
