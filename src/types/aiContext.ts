/**
 * AI context schema — SPEC §16.
 *
 * Built by `buildAIContext(dataset, filters)` (§16). Target size < 4 KB. All
 * monetary values are numbers in PKR (no formatting); all percentages numbers.
 *
 * Cost/profit-dependent fields are typed OPTIONAL (`?`) rather than only
 * `| null`. This is required to make two SPEC rules simultaneously true in
 * TypeScript: §12.5.4 — "The AI context sets hasCostData: false and OMITS every
 * profit field" — and the §26 test "hasCostData: false → all profit fields
 * ABSENT, not null-but-present". When cost data exists, these fields are
 * present with real numbers. The privacy filter (§16) guarantees customer,
 * city, order_id and any unrecognized field are never present.
 */

export interface ProductSummary {
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  profit: number | null;
  marginPct: number | null;
  trendPct: number | null;
  badges: string[];
}

export interface AIContext {
  business: {
    datasetName: string;
    isDemo: boolean;
    currency: "PKR";
    dateRange: { start: string; end: string; days: number };
    appliedFilters: { categories: string[] | "all"; datePreset: string };
  };

  dataQuality: {
    hasCostData: boolean;
    costCoveragePct: number;
    hasOrderIds: boolean;
    hasCategories: boolean;
    totalTransactions: number;
    skippedRows: number;
    distinctDays: number;
    trendReliability: "good" | "limited" | "insufficient";
  };

  totals: {
    revenue: number;
    /** Absent when hasCostData is false (§12.5.4). */
    cost?: number;
    /** Absent when hasCostData is false (§12.5.4). */
    profit?: number;
    /** Absent when hasCostData is false; null when revenue is 0 (§13). */
    profitMarginPct?: number | null;
    orders: number;
    unitsSold: number;
    averageOrderValue: number;
    /** null when the earlier period has zero revenue or <14 days (§13.2). */
    growthRatePct: number | null;
  };

  timeSeries: {
    granularity: "daily" | "weekly" | "monthly";
    // capped at 24 points; longer ranges re-bucketed to monthly before sending
    points: Array<{
      period: string;
      revenue: number;
      /** null per-point when no cost data. */
      profit: number | null;
      orders: number;
    }>;
  };

  /** top 8 by revenue */
  topProducts: ProductSummary[];
  /** bottom 5 by revenue */
  bottomProducts: ProductSummary[];
  /** top 5 by profit — omitted entirely if no cost data (§16). */
  mostProfitable?: ProductSummary[];
  /** high revenue + below-average margin — omitted if no cost data. */
  needsAttention?: ProductSummary[];
  /** up to 5 */
  decliningProducts: ProductSummary[];
  /** up to 5 */
  growingProducts: ProductSummary[];

  categories: Array<{
    name: string;
    revenue: number;
    /** null when no cost data. */
    profit: number | null;
    marginPct: number | null;
    unitsSold: number;
    contributionPct: number;
    trendPct: number | null;
  }>;

  patterns: {
    weekendUpliftPct: number | null;
    bestDayOfWeek: string | null;
    worstDayOfWeek: string | null;
    bestPeriod: { period: string; revenue: number } | null;
    worstPeriod: { period: string; revenue: number } | null;
  };

  anomalies: Array<{
    type:
      | "revenue_spike"
      | "revenue_drop"
      | "consecutive_decline"
      | "margin_outlier";
    /** factual, pre-computed, e.g. "Accessories revenue fell in 4 consecutive months" */
    description: string;
    /** e.g. "trend_pct: -35.2" */
    metric: string;
  }>;
}
