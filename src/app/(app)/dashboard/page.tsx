"use client";

/**
 * Dashboard — SPEC §9.3.
 * Filter bar · 6 KPI cards · charts (2-column grid, stacking to 1 on mobile) ·
 * product performance table.
 *
 * Every number here comes from useAnalytics(); this page computes nothing
 * itself (§21.3). The profit chart is not rendered at all when there is no cost
 * data — removed from the DOM, not shown empty (§12.5.2).
 *
 * AI insight cards (§9.3) are P1 and land after the AI layer is built (§32).
 */

import { RequireDataset } from "@/components/layout/RequireDataset";
import { FilterBar } from "@/components/layout/FilterBar";
import { KpiGrid } from "@/features/dashboard/KpiGrid";
import { ProductPerformanceTable } from "@/features/dashboard/ProductPerformanceTable";
import { CategoryBar, TopProductsChart } from "@/components/charts/BarCharts";
import { ProfitChart, RevenueChart } from "@/components/charts/TimeSeriesCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDataset } from "@/hooks/useDataset";
import { useFilters } from "@/hooks/useFilters";

function DashboardContent() {
  const { dataset } = useDataset();
  const { resetFilters } = useFilters();
  const analytics = useAnalytics();

  if (!dataset || !analytics) return null;

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
          <KpiGrid analytics={analytics} />

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart timeSeries={analytics.timeSeries} />
            {/* §12.5.2 — removed from the DOM entirely without cost data */}
            {analytics.meta.hasCostData && <ProfitChart timeSeries={analytics.timeSeries} />}
            <CategoryBar categories={analytics.categories} />
            <TopProductsChart products={analytics.products} variant="top" />
            {analytics.products.length > 10 && (
              <TopProductsChart products={analytics.products} variant="bottom" />
            )}
          </div>

          <ProductPerformanceTable
            products={analytics.products}
            hasCostData={analytics.meta.hasCostData}
          />
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireDataset>
      <DashboardContent />
    </RequireDataset>
  );
}
