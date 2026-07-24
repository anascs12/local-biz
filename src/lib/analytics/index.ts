/**
 * Analytics orchestrator — SPEC §13 / §21.3.
 *
 * `computeAnalytics` is the single entry point: it applies the filters ONCE and
 * derives every metric from that one filtered array (§11.4). It is pure and
 * framework-free, which is what makes the whole calculation layer unit-testable
 * without rendering anything (§21.3).
 */

import type { Dataset } from "@/types/dataset";
import type { AnalyticsResult } from "@/types/analytics";
import type { Filters } from "@/context/FilterContext";
import { applyFilters, datasetBounds, resolveDateWindow } from "./filters";
import { chooseGranularity, buildTimeSeries } from "./timeSeries";
import { computeDeltas, computeKpis, previousWindow } from "./kpis";
import { computeProducts } from "./products";
import { computeCategories } from "./categories";
import { computePatterns } from "./patterns";
import { detectAnomalies } from "./anomalies";
import { MIN_TREND_BUCKETS } from "./trends";
import { startOfDay } from "@/lib/utils/dates";

export * from "./filters";
export * from "./trends";
export * from "./timeSeries";
export * from "./kpis";
export * from "./products";
export * from "./categories";
export * from "./patterns";
export * from "./anomalies";

const EMPTY_WINDOW = { start: new Date(0), end: new Date(0), days: 0 };

function emptyResult(): AnalyticsResult {
  return {
    filtered: [],
    window: EMPTY_WINDOW,
    granularity: "daily",
    kpis: {
      totalRevenue: 0,
      totalCost: null,
      totalProfit: null,
      profitMarginPct: null,
      totalOrders: 0,
      unitsSold: 0,
      averageOrderValue: 0,
      growthRatePct: null,
      growthUnavailableReason: "insufficient_days",
      costedTransactionCount: 0,
      transactionCount: 0,
    },
    deltas: {
      available: false,
      revenuePct: null,
      profitPct: null,
      marginPointDelta: null,
      ordersPct: null,
      unitsPct: null,
      aovPct: null,
    },
    timeSeries: { granularity: "daily", points: [] },
    products: [],
    categories: [],
    patterns: {
      dayOfWeek: [],
      weekendUpliftPct: null,
      bestDayOfWeek: null,
      worstDayOfWeek: null,
      bestPeriod: null,
      worstPeriod: null,
    },
    anomalies: [],
    meta: {
      hasCostData: false,
      costCoveragePct: 0,
      distinctDays: 0,
      trendReliability: "insufficient",
      businessMarginPct: null,
    },
  };
}

export function computeAnalytics(dataset: Dataset, filters: Filters): AnalyticsResult {
  const bounds = datasetBounds(dataset.transactions);
  if (!bounds) return emptyResult();

  const window = resolveDateWindow(filters, bounds);
  const filtered = applyFilters(dataset.transactions, window, filters.categories);
  const granularity = chooseGranularity(window.days);

  const opts = { hasCostData: dataset.hasCostData, hasOrderIds: dataset.hasOrderIds };
  const kpis = computeKpis(filtered, window, opts);

  // §13.3 — only compare against a FULL preceding window that the data covers.
  const prevWindow = previousWindow(window);
  const historyReaches = startOfDay(bounds.min).getTime() <= prevWindow.start.getTime();
  const prevKpis = historyReaches
    ? computeKpis(
        applyFilters(dataset.transactions, prevWindow, filters.categories),
        prevWindow,
        opts,
      )
    : null;
  const deltas = computeDeltas(kpis, prevKpis);

  const timeSeries = buildTimeSeries(filtered, window, granularity, opts);

  const businessMarginPct = kpis.profitMarginPct;
  const products = computeProducts(filtered, window, granularity, {
    hasCostData: dataset.hasCostData,
    businessMarginPct,
  });
  const categories = computeCategories(filtered, window, granularity, {
    hasCostData: dataset.hasCostData,
  });
  const patterns = computePatterns(filtered, window, timeSeries);
  const anomalies = detectAnomalies(timeSeries, products, categories, {
    hasCostData: dataset.hasCostData,
    businessMarginPct,
  });

  const days = new Set<number>();
  for (const t of filtered) days.add(startOfDay(t.date).getTime());
  const distinctDays = days.size;

  const nonEmptyBuckets = timeSeries.points.filter((p) => p.revenue !== 0).length;
  const trendReliability =
    nonEmptyBuckets < MIN_TREND_BUCKETS
      ? "insufficient"
      : distinctDays < 14
        ? "limited"
        : "good";

  return {
    filtered,
    window,
    granularity,
    kpis,
    deltas,
    timeSeries,
    products,
    categories,
    patterns,
    anomalies,
    meta: {
      hasCostData: dataset.hasCostData,
      costCoveragePct:
        kpis.transactionCount > 0
          ? (kpis.costedTransactionCount / kpis.transactionCount) * 100
          : 0,
      distinctDays,
      trendReliability,
      businessMarginPct,
    },
  };
}
