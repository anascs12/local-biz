/**
 * Product intelligence — SPEC §13.6.
 *
 * | 🔥 Best Seller     | Units sold in the top 10% of all products (minimum 1)  |
 * | 💰 Most Profitable | Total profit in the top 10%. Requires hasCostData      |
 * | 📈 Growing         | trend_pct ≥ +15% with ≥4 buckets                       |
 * | ⚠️ Declining       | trend_pct ≤ −15% with ≥4 buckets                       |
 * | 📦 Low Volume      | Units sold in the bottom 25% of all products           |
 * | 🔎 Needs Attention | Revenue top 25% AND margin < (business average − 5pp)  |
 *
 * A product may hold multiple badges simultaneously — that overlap is often the
 * insight (§13.6).
 *
 * TIE HANDLING (§26 asks for it explicitly): cutoffs are evaluated by VALUE, not
 * by list position. The threshold is the value of the k-th ranked product, and
 * every product matching or beating it qualifies. Two products tied on units at
 * the boundary therefore both get the badge, instead of one winning on an
 * arbitrary sort order.
 */

import type { Transaction } from "@/types/transaction";
import type {
  DateWindow,
  Granularity,
  ProductBadge,
  ProductMetrics,
} from "@/types/analytics";
import { buildSeriesByKey } from "./timeSeries";
import { computeTrend } from "./trends";

export const NEEDS_ATTENTION_MARGIN_GAP = 5; // percentage points below the business average

/** Value at the top-`pct` cutoff; every value ≥ this qualifies. */
export function topCutoff(values: number[], pct: number): number | null {
  if (values.length === 0) return null;
  const k = Math.max(1, Math.ceil(values.length * pct));
  const sorted = [...values].sort((a, b) => b - a);
  return sorted[k - 1];
}

/** Value at the bottom-`pct` cutoff; every value ≤ this qualifies. */
export function bottomCutoff(values: number[], pct: number): number | null {
  if (values.length === 0) return null;
  const k = Math.max(1, Math.ceil(values.length * pct));
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[k - 1];
}

interface Acc {
  name: string;
  categoryCounts: Map<string, number>;
  units: number;
  revenue: number;
  cost: number;
  costedRevenue: number;
  costedCount: number;
  txns: number;
}

export interface ProductOptions {
  hasCostData: boolean;
  /** Business average margin — the 🔎 Needs Attention baseline (§13.6). */
  businessMarginPct: number | null;
}

export function computeProducts(
  txns: Transaction[],
  window: DateWindow,
  granularity: Granularity,
  opts: ProductOptions,
): ProductMetrics[] {
  const accs = new Map<string, Acc>();

  for (const t of txns) {
    let a = accs.get(t.product);
    if (!a) {
      a = {
        name: t.product,
        categoryCounts: new Map(),
        units: 0,
        revenue: 0,
        cost: 0,
        costedRevenue: 0,
        costedCount: 0,
        txns: 0,
      };
      accs.set(t.product, a);
    }
    a.units += t.quantity;
    a.revenue += t.revenue;
    a.txns += 1;
    a.categoryCounts.set(t.category, (a.categoryCounts.get(t.category) ?? 0) + 1);
    if (t.cost !== null) {
      a.cost += t.cost;
      a.costedRevenue += t.revenue;
      a.costedCount += 1;
    }
  }

  const series = buildSeriesByKey(txns, window, granularity, (t) => t.product);

  const products: ProductMetrics[] = [...accs.values()].map((a) => {
    const revenueSeries = series.get(a.name) ?? [];
    const trend = computeTrend(revenueSeries);
    const hasCost = opts.hasCostData && a.costedCount > 0;
    const profit = hasCost ? a.costedRevenue - a.cost : null;
    // Most frequent category wins if a product appears under several.
    let category = "Uncategorized";
    let best = -1;
    for (const [c, n] of a.categoryCounts) {
      if (n > best) {
        best = n;
        category = c;
      }
    }
    return {
      name: a.name,
      category,
      unitsSold: a.units,
      revenue: a.revenue,
      cost: hasCost ? a.cost : null,
      profit,
      marginPct: profit !== null && a.costedRevenue > 0 ? (profit / a.costedRevenue) * 100 : null,
      transactionCount: a.txns,
      trendPct: trend.pct,
      trendLabel: trend.label,
      revenueSeries,
      badges: [],
    };
  });

  return classifyProducts(products, opts);
}

/** Apply the §13.6 badge rules across the whole product set. */
export function classifyProducts(
  products: ProductMetrics[],
  opts: ProductOptions,
): ProductMetrics[] {
  if (products.length === 0) return products;

  const unitsCutoffTop = topCutoff(products.map((p) => p.unitsSold), 0.1);
  const unitsCutoffBottom = bottomCutoff(products.map((p) => p.unitsSold), 0.25);
  const revenueCutoffTop = topCutoff(products.map((p) => p.revenue), 0.25);
  const profitValues = products
    .map((p) => p.profit)
    .filter((v): v is number => v !== null);
  const profitCutoffTop = opts.hasCostData ? topCutoff(profitValues, 0.1) : null;

  for (const p of products) {
    const badges: ProductBadge[] = [];

    if (unitsCutoffTop !== null && p.unitsSold >= unitsCutoffTop) badges.push("best_seller");

    if (opts.hasCostData && profitCutoffTop !== null && p.profit !== null && p.profit >= profitCutoffTop) {
      badges.push("most_profitable");
    }

    if (p.trendLabel === "growing") badges.push("growing");
    if (p.trendLabel === "declining") badges.push("declining");

    if (unitsCutoffBottom !== null && p.unitsSold <= unitsCutoffBottom) badges.push("low_volume");

    if (
      opts.hasCostData &&
      opts.businessMarginPct !== null &&
      revenueCutoffTop !== null &&
      p.revenue >= revenueCutoffTop &&
      p.marginPct !== null &&
      p.marginPct < opts.businessMarginPct - NEEDS_ATTENTION_MARGIN_GAP
    ) {
      badges.push("needs_attention");
    }

    p.badges = badges;
  }

  return products;
}
