/**
 * Headline KPIs, growth and deltas — SPEC §13.1 / §13.2 / §13.3.
 *
 *   Total Revenue       = Σ revenue
 *   Total Cost          = Σ cost                     (rows with cost !== null)
 *   Total Profit        = Total Revenue(costed rows) − Total Cost
 *   Profit Margin %     = (Total Profit / Total Revenue(costed rows)) × 100
 *   Total Orders        = hasOrderIds ? distinct(order_id) : count(transactions)
 *   Units Sold          = Σ quantity
 *   Average Order Value = Total Revenue / Total Orders
 *
 * Total Profit deliberately uses revenue from costed rows only, so margin is
 * internally consistent when cost coverage is partial (§13.1). Rows with a
 * missing cost are EXCLUDED from profit aggregates — never treated as zero
 * cost (§10.3 / §12.5).
 */

import type { Transaction } from "@/types/transaction";
import type { DateWindow, KpiDeltas, Kpis } from "@/types/analytics";
import { addDays, startOfDay } from "@/lib/utils/dates";

export interface KpiOptions {
  hasCostData: boolean;
  hasOrderIds: boolean;
}

/** §13.2 — requires at least this many days of data. */
export const MIN_GROWTH_DAYS = 14;

export function countOrders(txns: Transaction[], hasOrderIds: boolean): number {
  if (!hasOrderIds) return txns.length;
  const ids = new Set<string>();
  for (const t of txns) if (t.order_id) ids.add(t.order_id);
  return ids.size;
}

export function computeGrowthRate(
  txns: Transaction[],
  window: DateWindow,
): { pct: number | null; reason: "insufficient_days" | "zero_baseline" | null } {
  if (window.days < MIN_GROWTH_DAYS) {
    return { pct: null, reason: "insufficient_days" };
  }
  // Split the range into two equal halves by time.
  const boundary = addDays(window.start, Math.floor(window.days / 2)).getTime();
  let first = 0;
  let second = 0;
  for (const t of txns) {
    if (startOfDay(t.date).getTime() < boundary) first += t.revenue;
    else second += t.revenue;
  }
  // Never report Infinity or a meaningless 100% against a zero baseline (§13.2).
  if (first <= 0) return { pct: null, reason: "zero_baseline" };
  return { pct: ((second - first) / first) * 100, reason: null };
}

/**
 * Period growth for revenue, orders and AOV — SPEC §9.4 summary strip.
 *
 * Uses the same two-equal-halves rule as §13.2's revenue growth rate, applied
 * to each measure, so the three figures on the strip are consistent with the
 * Growth Rate KPI on the dashboard. A zero baseline yields null, never Infinity.
 */
export interface PeriodGrowth {
  revenuePct: number | null;
  ordersPct: number | null;
  aovPct: number | null;
  reason: "insufficient_days" | "zero_baseline" | null;
}

export function computePeriodGrowth(
  txns: Transaction[],
  window: DateWindow,
  opts: { hasOrderIds: boolean },
): PeriodGrowth {
  if (window.days < MIN_GROWTH_DAYS) {
    return { revenuePct: null, ordersPct: null, aovPct: null, reason: "insufficient_days" };
  }

  const boundary = addDays(window.start, Math.floor(window.days / 2)).getTime();
  const first: Transaction[] = [];
  const second: Transaction[] = [];
  for (const t of txns) {
    (startOfDay(t.date).getTime() < boundary ? first : second).push(t);
  }

  const sum = (rows: Transaction[]) => rows.reduce((s, t) => s + t.revenue, 0);
  const firstRevenue = sum(first);
  const secondRevenue = sum(second);
  const firstOrders = countOrders(first, opts.hasOrderIds);
  const secondOrders = countOrders(second, opts.hasOrderIds);
  const firstAov = firstOrders > 0 ? firstRevenue / firstOrders : 0;
  const secondAov = secondOrders > 0 ? secondRevenue / secondOrders : 0;

  const pct = (from: number, to: number): number | null =>
    from > 0 ? ((to - from) / from) * 100 : null;

  return {
    revenuePct: pct(firstRevenue, secondRevenue),
    ordersPct: pct(firstOrders, secondOrders),
    aovPct: pct(firstAov, secondAov),
    reason: firstRevenue <= 0 ? "zero_baseline" : null,
  };
}

export function computeKpis(
  txns: Transaction[],
  window: DateWindow,
  opts: KpiOptions,
): Kpis {
  let totalRevenue = 0;
  let unitsSold = 0;
  let costedRevenue = 0;
  let totalCost = 0;
  let costedTransactionCount = 0;

  for (const t of txns) {
    totalRevenue += t.revenue;
    unitsSold += t.quantity;
    if (t.cost !== null) {
      costedRevenue += t.revenue;
      totalCost += t.cost;
      costedTransactionCount += 1;
    }
  }

  const totalOrders = countOrders(txns, opts.hasOrderIds);
  const profit = costedRevenue - totalCost;
  const growth = computeGrowthRate(txns, window);

  return {
    totalRevenue,
    totalCost: opts.hasCostData ? totalCost : null,
    totalProfit: opts.hasCostData ? profit : null,
    profitMarginPct:
      opts.hasCostData && costedRevenue > 0 ? (profit / costedRevenue) * 100 : null,
    totalOrders,
    unitsSold,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    growthRatePct: growth.pct,
    growthUnavailableReason: growth.reason,
    costedTransactionCount,
    transactionCount: txns.length,
  };
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return null; // suppressed rather than Infinity
  return ((current - previous) / previous) * 100;
}

/** The previous window of equal length, immediately preceding `window` (§13.3). */
export function previousWindow(window: DateWindow): DateWindow {
  const end = addDays(window.start, -1);
  const start = addDays(end, -(window.days - 1));
  return { start, end, days: window.days };
}

/**
 * §13.3 — deltas are suppressed entirely (available: false) when the dataset
 * does not extend far enough back, rather than computed against a partial period.
 */
export function computeDeltas(
  current: Kpis,
  previous: Kpis | null,
): KpiDeltas {
  if (!previous) {
    return {
      available: false,
      revenuePct: null,
      profitPct: null,
      marginPointDelta: null,
      ordersPct: null,
      unitsPct: null,
      aovPct: null,
    };
  }
  return {
    available: true,
    revenuePct: pctChange(current.totalRevenue, previous.totalRevenue),
    profitPct: pctChange(current.totalProfit, previous.totalProfit),
    marginPointDelta:
      current.profitMarginPct !== null && previous.profitMarginPct !== null
        ? current.profitMarginPct - previous.profitMarginPct
        : null,
    ordersPct: pctChange(current.totalOrders, previous.totalOrders),
    unitsPct: pctChange(current.unitsSold, previous.unitsSold),
    aovPct: pctChange(current.averageOrderValue, previous.averageOrderValue),
  };
}
