/**
 * Analytics result types — SPEC §13.
 *
 * Every figure the UI shows comes from one of these objects, produced by the
 * pure functions in `src/lib/analytics/`. Pages never compute their own metric
 * (§21.3). `null` consistently means "not available" — never 0, NaN or Infinity.
 */

import type { Transaction } from "./transaction";

export type Granularity = "daily" | "weekly" | "monthly";

/** §13.5 classification of a trend_pct value. */
export type TrendLabel = "growing" | "declining" | "stable" | "insufficient";

/** §13.6 product classifications. */
export type ProductBadge =
  | "best_seller"
  | "most_profitable"
  | "growing"
  | "declining"
  | "low_volume"
  | "needs_attention";

export interface DateWindow {
  start: Date;
  end: Date;
  /** Inclusive day count. */
  days: number;
}

export interface Kpis {
  totalRevenue: number;
  /** null when there is no cost data — never estimated (§12.5). */
  totalCost: number | null;
  totalProfit: number | null;
  profitMarginPct: number | null;
  totalOrders: number;
  unitsSold: number;
  averageOrderValue: number;
  /** null when unavailable; see growthUnavailableReason (§13.2). */
  growthRatePct: number | null;
  growthUnavailableReason: "insufficient_days" | "zero_baseline" | null;
  /** §13.1 footnote — "Based on N of M transactions that include cost data." */
  costedTransactionCount: number;
  transactionCount: number;
}

/**
 * §13.3 — comparison against the immediately preceding window of equal length.
 * `available` is false when the dataset does not extend far enough back, in
 * which case deltas are suppressed rather than computed against a partial period.
 */
export interface KpiDeltas {
  available: boolean;
  revenuePct: number | null;
  profitPct: number | null;
  /** Percentage-POINT change (a % change of a % would be misleading). */
  marginPointDelta: number | null;
  ordersPct: number | null;
  unitsPct: number | null;
  aovPct: number | null;
}

export interface TimeSeriesPoint {
  /** YYYY-MM-DD for daily/weekly bucket starts, YYYY-MM for monthly. */
  period: string;
  start: Date;
  revenue: number;
  cost: number | null;
  profit: number | null;
  orders: number;
  units: number;
  averageOrderValue: number;
}

export interface TimeSeries {
  granularity: Granularity;
  points: TimeSeriesPoint[];
}

export interface TrendResult {
  pct: number | null;
  label: TrendLabel;
  /** Number of non-empty buckets backing the regression (§13.5 needs ≥4). */
  nonEmptyBuckets: number;
}

export interface ProductMetrics {
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cost: number | null;
  profit: number | null;
  marginPct: number | null;
  transactionCount: number;
  trendPct: number | null;
  trendLabel: TrendLabel;
  /** Bucketed revenue aligned to the global time series — powers the sparkline. */
  revenueSeries: number[];
  badges: ProductBadge[];
}

export interface CategoryMetrics {
  name: string;
  revenue: number;
  cost: number | null;
  profit: number | null;
  marginPct: number | null;
  unitsSold: number;
  contributionPct: number;
  trendPct: number | null;
  trendLabel: TrendLabel;
}

export interface DayOfWeekStat {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  label: string;
  totalRevenue: number;
  /** Calendar occurrences of this weekday inside the window (§13.8). */
  occurrences: number;
  meanRevenue: number;
}

export interface Patterns {
  dayOfWeek: DayOfWeekStat[];
  /** Only reported when the range covers ≥3 weekends (§13.8). */
  weekendUpliftPct: number | null;
  bestDayOfWeek: string | null;
  worstDayOfWeek: string | null;
  bestPeriod: { period: string; revenue: number } | null;
  worstPeriod: { period: string; revenue: number } | null;
}

export interface Anomaly {
  type: "revenue_spike" | "revenue_drop" | "consecutive_decline" | "margin_outlier";
  /** Factual, pre-computed prose — the LLM does no calculation (§15.1). */
  description: string;
  /** e.g. "trend_pct: -35.2" */
  metric: string;
}

export interface AnalyticsMeta {
  hasCostData: boolean;
  costCoveragePct: number;
  distinctDays: number;
  trendReliability: "good" | "limited" | "insufficient";
  /** Business average margin — the baseline for 🔎 Needs Attention (§13.6). */
  businessMarginPct: number | null;
}

export interface AnalyticsResult {
  filtered: Transaction[];
  window: DateWindow;
  granularity: Granularity;
  kpis: Kpis;
  deltas: KpiDeltas;
  timeSeries: TimeSeries;
  products: ProductMetrics[];
  categories: CategoryMetrics[];
  patterns: Patterns;
  anomalies: Anomaly[];
  meta: AnalyticsMeta;
}
