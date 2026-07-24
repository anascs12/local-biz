"use client";

/**
 * Sales Analytics — SPEC §9.4.
 *
 * Granularity toggle (Daily / Weekly / Monthly) applies to EVERY chart on the
 * page. Contents: revenue, profit, order count, units and AOV trends, plus the
 * day-of-week breakdown that surfaces the weekend spike. A summary strip above
 * the charts states period growth for revenue, orders and AOV.
 *
 * The override is page-local (§13.4: "automatic unless the user overrides it on
 * /analytics"), so the time series is re-bucketed here rather than in the
 * global analytics result — every other page keeps the automatic granularity.
 */

import * as React from "react";
import { RequireDataset } from "@/components/layout/RequireDataset";
import { FilterBar } from "@/components/layout/FilterBar";
import { GranularityToggle } from "@/features/analytics/GranularityToggle";
import { TrendSummaryStrip } from "@/features/analytics/TrendSummaryStrip";
import { DayOfWeekChart } from "@/components/charts/DayOfWeekChart";
import {
  MetricTrendChart,
  ProfitChart,
  RevenueChart,
} from "@/components/charts/TimeSeriesCharts";
import { CHART_COLORS } from "@/components/charts/ChartCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDataset } from "@/hooks/useDataset";
import { useFilters } from "@/hooks/useFilters";
import { buildTimeSeries } from "@/lib/analytics/timeSeries";
import { computePeriodGrowth } from "@/lib/analytics/kpis";
import { formatNumber, formatPKR, formatPKRCompact } from "@/lib/utils/format";
import type { Granularity } from "@/types/analytics";

function AnalyticsContent() {
  const { dataset } = useDataset();
  const { resetFilters } = useFilters();
  const analytics = useAnalytics();
  const [override, setOverride] = React.useState<Granularity | null>(null);

  // Hooks must run before any early return.
  const granularity: Granularity = override ?? analytics?.granularity ?? "daily";

  const timeSeries = React.useMemo(() => {
    if (!analytics || !dataset) return null;
    // Reuse the automatic series when the granularity matches, so the common
    // case does no extra work.
    if (granularity === analytics.granularity) return analytics.timeSeries;
    return buildTimeSeries(analytics.filtered, analytics.window, granularity, {
      hasCostData: dataset.hasCostData,
      hasOrderIds: dataset.hasOrderIds,
    });
  }, [analytics, dataset, granularity]);

  const growth = React.useMemo(() => {
    if (!analytics || !dataset) return null;
    return computePeriodGrowth(analytics.filtered, analytics.window, {
      hasOrderIds: dataset.hasOrderIds,
    });
  }, [analytics, dataset]);

  if (!dataset || !analytics || !timeSeries || !growth) return null;

  const allCategories = [...new Set(dataset.transactions.map((t) => t.category))].sort();
  const hasRows = analytics.filtered.length > 0;

  return (
    <>
      <FilterBar
        categories={allCategories}
        shownCount={analytics.filtered.length}
        rangeStart={analytics.window.start}
        rangeEnd={analytics.window.end}
      />

      {!hasRows ? (
        <EmptyState
          title="No transactions in this date range"
          description="Try a wider date range or turn some categories back on."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 p-4 md:p-6">
          <div>
            <h1 className="text-h1 text-text-900">Sales Analytics</h1>
            <p className="text-small text-text-600">
              How revenue, orders and order value moved across the selected period.
            </p>
          </div>

          <GranularityToggle
            value={granularity}
            auto={analytics.granularity}
            onChange={setOverride}
          />

          <TrendSummaryStrip growth={growth} hasOrderIds={dataset.hasOrderIds} />

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart timeSeries={timeSeries} />
            {/* §12.5.2 — removed from the DOM entirely without cost data */}
            {analytics.meta.hasCostData && <ProfitChart timeSeries={timeSeries} />}

            <MetricTrendChart
              timeSeries={timeSeries}
              metric="orders"
              title="Orders over time"
              definition="The number of separate sales in each period."
              seriesLabel="Orders"
              color={CHART_COLORS.primary}
              format={(v) => formatNumber(v)}
            />
            <MetricTrendChart
              timeSeries={timeSeries}
              metric="units"
              title="Units sold over time"
              definition="The total quantity of items sold in each period."
              seriesLabel="Units"
              color={CHART_COLORS.muted}
              format={(v) => formatNumber(v)}
            />
            <MetricTrendChart
              timeSeries={timeSeries}
              metric="averageOrderValue"
              title="Average order value over time"
              definition="Revenue divided by the number of orders in each period."
              seriesLabel="AOV (Rs.)"
              color={CHART_COLORS.accent}
              format={(v) => formatPKRCompact(v)}
            />
            <DayOfWeekChart patterns={analytics.patterns} />
          </div>

          {!dataset.hasOrderIds && (
            <p className="text-caption text-text-400">
              Average order value is calculated per transaction — your file has no order ID
              column, so each row is treated as one order.
            </p>
          )}

          {analytics.meta.trendReliability !== "good" && (
            <p className="text-caption text-text-400">
              Trend analysis needs at least two weeks of data to be meaningful. Growth figures on
              this range are indicative only.
            </p>
          )}

          <p className="sr-only">
            Total revenue in this period: {formatPKR(analytics.kpis.totalRevenue)}.
          </p>
        </div>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireDataset>
      <AnalyticsContent />
    </RequireDataset>
  );
}
