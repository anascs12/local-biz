/**
 * Time series bucketing — SPEC §13.4.
 *
 * Granularity is automatic unless overridden on /analytics:
 *   range ≤ 31 days → daily · 32–120 → weekly (ISO weeks, Monday start) · >120 → monthly
 *
 * "Empty buckets are emitted with zeros so charts show real gaps rather than
 * misleadingly connecting across dead periods."
 */

import type { Transaction } from "@/types/transaction";
import type {
  DateWindow,
  Granularity,
  TimeSeries,
  TimeSeriesPoint,
} from "@/types/analytics";
import {
  addDays,
  addMonths,
  isoDate,
  isoMonth,
  startOfMonth,
  startOfWeekMonday,
} from "@/lib/utils/dates";

export function chooseGranularity(days: number): Granularity {
  if (days <= 31) return "daily";
  if (days <= 120) return "weekly";
  return "monthly";
}

export function bucketStartOf(date: Date, g: Granularity): Date {
  switch (g) {
    case "daily":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    case "weekly":
      return startOfWeekMonday(date);
    case "monthly":
      return startOfMonth(date);
  }
}

export function bucketKey(start: Date, g: Granularity): string {
  return g === "monthly" ? isoMonth(start) : isoDate(start);
}

export function bucketKeyOf(date: Date, g: Granularity): string {
  return bucketKey(bucketStartOf(date, g), g);
}

/** All bucket starts spanning the window, including empty ones (§13.4). */
export function enumerateBuckets(
  window: DateWindow,
  g: Granularity,
): { key: string; start: Date }[] {
  const out: { key: string; start: Date }[] = [];
  let cursor = bucketStartOf(window.start, g);
  const endMs = window.end.getTime();
  // Guard against pathological windows producing unbounded loops.
  for (let i = 0; i < 20_000 && cursor.getTime() <= endMs; i++) {
    out.push({ key: bucketKey(cursor, g), start: cursor });
    cursor =
      g === "monthly"
        ? addMonths(cursor, 1)
        : addDays(cursor, g === "weekly" ? 7 : 1);
  }
  return out;
}

interface Bucket {
  revenue: number;
  cost: number;
  costedRevenue: number;
  costedCount: number;
  units: number;
  txns: number;
  orderIds: Set<string>;
}

export function buildTimeSeries(
  transactions: Transaction[],
  window: DateWindow,
  granularity: Granularity,
  opts: { hasCostData: boolean; hasOrderIds: boolean },
): TimeSeries {
  const buckets = enumerateBuckets(window, granularity);
  const map = new Map<string, Bucket>();
  for (const b of buckets) {
    map.set(b.key, {
      revenue: 0,
      cost: 0,
      costedRevenue: 0,
      costedCount: 0,
      units: 0,
      txns: 0,
      orderIds: new Set(),
    });
  }

  for (const t of transactions) {
    const key = bucketKeyOf(t.date, granularity);
    const b = map.get(key);
    if (!b) continue; // outside the window
    b.revenue += t.revenue;
    b.units += t.quantity;
    b.txns += 1;
    if (t.order_id) b.orderIds.add(t.order_id);
    if (t.cost !== null) {
      b.cost += t.cost;
      b.costedRevenue += t.revenue;
      b.costedCount += 1;
    }
  }

  const points: TimeSeriesPoint[] = buckets.map(({ key, start }) => {
    const b = map.get(key)!;
    const orders = opts.hasOrderIds ? b.orderIds.size : b.txns;
    // Profit uses costed rows only, so it stays internally consistent (§13.1).
    const profit = opts.hasCostData ? b.costedRevenue - b.cost : null;
    return {
      period: key,
      start,
      revenue: b.revenue,
      cost: opts.hasCostData ? b.cost : null,
      profit,
      orders,
      units: b.units,
      averageOrderValue: orders > 0 ? b.revenue / orders : 0,
    };
  });

  return { granularity, points };
}

/** Bucketed revenue per product/category key, aligned to the same buckets. */
export function buildSeriesByKey(
  transactions: Transaction[],
  window: DateWindow,
  granularity: Granularity,
  keyOf: (t: Transaction) => string,
): Map<string, number[]> {
  const buckets = enumerateBuckets(window, granularity);
  const index = new Map<string, number>();
  buckets.forEach((b, i) => index.set(b.key, i));

  const out = new Map<string, number[]>();
  for (const t of transactions) {
    const k = keyOf(t);
    let series = out.get(k);
    if (!series) {
      series = new Array(buckets.length).fill(0);
      out.set(k, series);
    }
    const i = index.get(bucketKeyOf(t.date, granularity));
    if (i !== undefined) series[i] += t.revenue;
  }
  return out;
}
