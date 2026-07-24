/**
 * AI context builder — SPEC §16 / §15.1.
 *
 * The LLM performs ZERO calculation. It receives this compact, pre-computed
 * JSON summary and produces prose. Every figure here comes from the same
 * analytics functions the dashboard renders, so the numbers in an AI answer and
 * the numbers on screen are the same objects (§15.1).
 *
 * PRIVACY (§16 / §23) — enforced BY CONSTRUCTION, not by filtering afterwards:
 * this module never spreads a Transaction and never reads `customer`,
 * `order_id`, `transaction_id`, or any unrecognized column. Each object below is
 * assembled field by field from an explicit allowlist. There is no `...t` in
 * this file, and that is deliberate — a spread is what would leak a customer
 * name into a third-party request.
 */

import type { Dataset } from "@/types/dataset";
import type { AIContext, ProductSummary } from "@/types/aiContext";
import type {
  AnalyticsResult,
  CategoryMetrics,
  ProductMetrics,
} from "@/types/analytics";
import type { Filters } from "@/context/FilterContext";
import { computeAnalytics } from "@/lib/analytics";
import { buildTimeSeries } from "@/lib/analytics/timeSeries";
import { BADGE_LABEL } from "@/lib/analytics/badges";
import { isoDate } from "@/lib/utils/dates";

/** §16 — timeSeries is capped at 24 points. */
const MAX_TIME_SERIES_POINTS = 24;
/**
 * §16 does not cap `categories` or `anomalies`, but it does target <4 KB. These
 * caps keep a pathological dataset (hundreds of categories) inside that budget;
 * both are ordered by significance so the caps drop only the least important.
 */
const MAX_CATEGORIES = 15;
const MAX_ANOMALIES = 8;

const round = (n: number, dp = 2): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
const roundOrNull = (n: number | null | undefined, dp = 2): number | null =>
  n === null || n === undefined || !Number.isFinite(n) ? null : round(n, dp);

/**
 * Assemble a ProductSummary from named fields only.
 * NOTE: the explicit field list is the privacy guarantee — do not replace it
 * with a spread, and do not add fields that are not in the §16 schema.
 */
function toProductSummary(p: ProductMetrics): ProductSummary {
  return {
    name: p.name,
    category: p.category,
    unitsSold: p.unitsSold,
    revenue: round(p.revenue, 0),
    profit: roundOrNull(p.profit, 0),
    marginPct: roundOrNull(p.marginPct, 1),
    trendPct: roundOrNull(p.trendPct, 1),
    badges: p.badges.map((b) => BADGE_LABEL[b]),
  };
}

function toCategorySummary(c: CategoryMetrics) {
  return {
    name: c.name,
    revenue: round(c.revenue, 0),
    profit: roundOrNull(c.profit, 0),
    marginPct: roundOrNull(c.marginPct, 1),
    unitsSold: c.unitsSold,
    contributionPct: round(c.contributionPct, 1),
    trendPct: roundOrNull(c.trendPct, 1),
  };
}

/** §16 — cap the series at 24 points, re-bucketing to monthly when longer. */
function buildPoints(analytics: AnalyticsResult, dataset: Dataset) {
  let series = analytics.timeSeries;
  if (series.points.length > MAX_TIME_SERIES_POINTS) {
    series = buildTimeSeries(analytics.filtered, analytics.window, "monthly", {
      hasCostData: dataset.hasCostData,
      hasOrderIds: dataset.hasOrderIds,
    });
  }
  const points = series.points.slice(-MAX_TIME_SERIES_POINTS);
  return {
    granularity: series.granularity,
    points: points.map((p) => ({
      period: p.period,
      revenue: round(p.revenue, 0),
      profit: roundOrNull(p.profit, 0),
      orders: p.orders,
    })),
  };
}

export interface BuildContextOptions {
  /** Pre-computed analytics, to avoid recomputing when the caller already has it. */
  analytics?: AnalyticsResult;
}

export function buildAIContext(
  dataset: Dataset,
  filters: Filters,
  options: BuildContextOptions = {},
): AIContext {
  const analytics = options.analytics ?? computeAnalytics(dataset, filters);
  const { kpis, meta, patterns, window } = analytics;
  const hasCost = meta.hasCostData;

  const byRevenueDesc = [...analytics.products].sort((a, b) => b.revenue - a.revenue);
  const byRevenueAsc = [...analytics.products].sort((a, b) => a.revenue - b.revenue);

  const context: AIContext = {
    business: {
      datasetName: dataset.name,
      isDemo: dataset.isDemo,
      currency: "PKR",
      dateRange: {
        start: isoDate(window.start),
        end: isoDate(window.end),
        days: window.days,
      },
      appliedFilters: {
        categories: filters.categories === "all" ? "all" : [...filters.categories],
        datePreset: filters.datePreset,
      },
    },

    dataQuality: {
      hasCostData: hasCost,
      costCoveragePct: round(meta.costCoveragePct, 1),
      hasOrderIds: dataset.hasOrderIds,
      hasCategories: dataset.hasCategories,
      totalTransactions: kpis.transactionCount,
      skippedRows: dataset.skippedRowCount,
      distinctDays: meta.distinctDays,
      trendReliability: meta.trendReliability,
    },

    totals: {
      revenue: round(kpis.totalRevenue, 0),
      // §12.5.4 — profit fields are OMITTED entirely without cost data.
      ...(hasCost
        ? {
            cost: round(kpis.totalCost ?? 0, 0),
            profit: round(kpis.totalProfit ?? 0, 0),
            profitMarginPct: roundOrNull(kpis.profitMarginPct, 1),
          }
        : {}),
      orders: kpis.totalOrders,
      unitsSold: kpis.unitsSold,
      averageOrderValue: round(kpis.averageOrderValue, 0),
      growthRatePct: roundOrNull(kpis.growthRatePct, 1),
    },

    timeSeries: buildPoints(analytics, dataset),

    topProducts: byRevenueDesc.slice(0, 8).map(toProductSummary),
    bottomProducts: byRevenueAsc.slice(0, 5).map(toProductSummary),

    // §16 — omitted entirely when there is no cost data.
    ...(hasCost
      ? {
          mostProfitable: [...analytics.products]
            .filter((p) => p.profit !== null)
            .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
            .slice(0, 5)
            .map(toProductSummary),
          needsAttention: analytics.products
            .filter((p) => p.badges.includes("needs_attention"))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(toProductSummary),
        }
      : {}),

    decliningProducts: analytics.products
      .filter((p) => p.trendLabel === "declining")
      .sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0))
      .slice(0, 5)
      .map(toProductSummary),

    growingProducts: analytics.products
      .filter((p) => p.trendLabel === "growing")
      .sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0))
      .slice(0, 5)
      .map(toProductSummary),

    categories: [...analytics.categories]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, MAX_CATEGORIES)
      .map(toCategorySummary),

    patterns: {
      weekendUpliftPct: roundOrNull(patterns.weekendUpliftPct, 1),
      bestDayOfWeek: patterns.bestDayOfWeek,
      worstDayOfWeek: patterns.worstDayOfWeek,
      bestPeriod: patterns.bestPeriod
        ? { period: patterns.bestPeriod.period, revenue: round(patterns.bestPeriod.revenue, 0) }
        : null,
      worstPeriod: patterns.worstPeriod
        ? { period: patterns.worstPeriod.period, revenue: round(patterns.worstPeriod.revenue, 0) }
        : null,
    },

    anomalies: analytics.anomalies.slice(0, MAX_ANOMALIES).map((a) => ({
      type: a.type,
      description: a.description,
      metric: a.metric,
    })),
  };

  return context;
}

/** Byte size of the serialized context — used by the size guards (§15.3 / §16). */
export function contextByteSize(context: AIContext): number {
  return Buffer.byteLength(JSON.stringify(context), "utf8");
}
