/**
 * Anomaly detection — SPEC §13.9. Feeds the AI insight cards (§19).
 *
 * - A bucket is anomalous when its revenue lies more than 2 standard deviations
 *   from the series mean, given ≥8 buckets.
 * - Any product whose revenue fell in ≥3 consecutive buckets.
 * - Any category with trend_pct ≤ −20%.
 *
 * Descriptions are FACTUAL and PRE-COMPUTED here in TypeScript. The LLM does
 * zero calculation (§15.1) — it only explains what this function found.
 */

import type {
  Anomaly,
  CategoryMetrics,
  ProductMetrics,
  TimeSeries,
} from "@/types/analytics";

export const MIN_BUCKETS_FOR_OUTLIER = 8;
export const OUTLIER_SD = 2;
export const CONSECUTIVE_DECLINE_BUCKETS = 3;
export const CATEGORY_DECLINE_THRESHOLD = -20;

const round1 = (n: number) => Math.round(n * 10) / 10;
const money = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;

/** Longest run of consecutive strictly-decreasing steps in a series. */
export function longestDeclineRun(series: number[]): number {
  let best = 0;
  let run = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i] < series[i - 1]) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export function detectAnomalies(
  timeSeries: TimeSeries,
  products: ProductMetrics[],
  categories: CategoryMetrics[],
  opts: { hasCostData: boolean; businessMarginPct: number | null },
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const points = timeSeries.points;

  // 1. Revenue spikes / drops beyond 2 SD (needs ≥8 buckets).
  if (points.length >= MIN_BUCKETS_FOR_OUTLIER) {
    const values = points.map((p) => p.revenue);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length,
    );
    if (sd > 0) {
      for (const p of points) {
        const z = (p.revenue - mean) / sd;
        if (z > OUTLIER_SD) {
          anomalies.push({
            type: "revenue_spike",
            description: `Revenue in ${p.period} was unusually high at ${money(p.revenue)}, against a period average of ${money(mean)}.`,
            metric: `z_score: ${round1(z)}`,
          });
        } else if (z < -OUTLIER_SD) {
          anomalies.push({
            type: "revenue_drop",
            description: `Revenue in ${p.period} was unusually low at ${money(p.revenue)}, against a period average of ${money(mean)}.`,
            metric: `z_score: ${round1(z)}`,
          });
        }
      }
    }
  }

  // 2. Products falling in ≥3 consecutive buckets.
  for (const p of products) {
    const run = longestDeclineRun(p.revenueSeries);
    if (run >= CONSECUTIVE_DECLINE_BUCKETS) {
      anomalies.push({
        type: "consecutive_decline",
        description: `${p.name} revenue fell in ${run} consecutive ${timeSeries.granularity === "monthly" ? "months" : timeSeries.granularity === "weekly" ? "weeks" : "days"}.`,
        metric: `consecutive_declines: ${run}`,
      });
    }
  }

  // 3. Categories with trend_pct ≤ −20%.
  for (const c of categories) {
    if (c.trendPct !== null && c.trendPct <= CATEGORY_DECLINE_THRESHOLD) {
      anomalies.push({
        type: "consecutive_decline",
        description: `${c.name} revenue is declining across the period, ending at ${money(c.revenue)} total.`,
        metric: `trend_pct: ${round1(c.trendPct)}`,
      });
    }
  }

  // 4. Margin outliers — high revenue but well below the business average.
  if (opts.hasCostData && opts.businessMarginPct !== null) {
    for (const p of products) {
      if (p.badges.includes("needs_attention") && p.marginPct !== null) {
        anomalies.push({
          type: "margin_outlier",
          description: `${p.name} is a top-revenue product but its margin is below the business average.`,
          metric: `margin_pct: ${round1(p.marginPct)} vs business_avg: ${round1(opts.businessMarginPct)}`,
        });
      }
    }
  }

  return anomalies;
}
