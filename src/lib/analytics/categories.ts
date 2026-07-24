/**
 * Category intelligence — SPEC §13.7.
 *
 *   Category Revenue        = Σ revenue where category = C
 *   Category Profit         = Σ profit where category = C
 *   Category Margin %       = (Category Profit / Category Revenue) × 100
 *   Category Contribution % = (Category Revenue / Total Revenue) × 100
 *   Category Growth %       = trend_pct over that category's revenue series
 */

import type { Transaction } from "@/types/transaction";
import type { CategoryMetrics, DateWindow, Granularity } from "@/types/analytics";
import { buildSeriesByKey } from "./timeSeries";
import { computeTrend } from "./trends";

interface Acc {
  name: string;
  units: number;
  revenue: number;
  cost: number;
  costedRevenue: number;
  costedCount: number;
}

export function computeCategories(
  txns: Transaction[],
  window: DateWindow,
  granularity: Granularity,
  opts: { hasCostData: boolean },
): CategoryMetrics[] {
  const accs = new Map<string, Acc>();
  let totalRevenue = 0;

  for (const t of txns) {
    let a = accs.get(t.category);
    if (!a) {
      a = { name: t.category, units: 0, revenue: 0, cost: 0, costedRevenue: 0, costedCount: 0 };
      accs.set(t.category, a);
    }
    a.units += t.quantity;
    a.revenue += t.revenue;
    totalRevenue += t.revenue;
    if (t.cost !== null) {
      a.cost += t.cost;
      a.costedRevenue += t.revenue;
      a.costedCount += 1;
    }
  }

  const series = buildSeriesByKey(txns, window, granularity, (t) => t.category);

  return [...accs.values()]
    .map((a) => {
      const trend = computeTrend(series.get(a.name) ?? []);
      const hasCost = opts.hasCostData && a.costedCount > 0;
      const profit = hasCost ? a.costedRevenue - a.cost : null;
      return {
        name: a.name,
        revenue: a.revenue,
        cost: hasCost ? a.cost : null,
        profit,
        marginPct:
          profit !== null && a.costedRevenue > 0 ? (profit / a.costedRevenue) * 100 : null,
        unitsSold: a.units,
        // Guarded denominator — contribution is 0, never NaN, on an empty set.
        contributionPct: totalRevenue !== 0 ? (a.revenue / totalRevenue) * 100 : 0,
        trendPct: trend.pct,
        trendLabel: trend.label,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
