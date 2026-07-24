"use client";

/**
 * Category Intelligence — SPEC §9.6.
 * Four highlight cards · contribution donut · revenue-vs-profit grouped bar ·
 * category table.
 *
 * §10.4: when more than 50% of rows are Uncategorized, a caution banner says so
 * rather than quietly presenting a misleading breakdown.
 */

import { RequireDataset } from "@/components/layout/RequireDataset";
import { FilterBar } from "@/components/layout/FilterBar";
import { CategoryCards } from "@/features/categories/CategoryCards";
import { CategoryTable } from "@/features/categories/CategoryTable";
import { ContributionDonut, CategoryRevenueProfitChart } from "@/components/charts/CategoryCharts";
import { CategoryBar } from "@/components/charts/BarCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDataset } from "@/hooks/useDataset";
import { useFilters } from "@/hooks/useFilters";
import { formatPct } from "@/lib/utils/format";

const UNCATEGORIZED_WARN_SHARE = 50;

function CategoriesContent() {
  const { dataset } = useDataset();
  const { resetFilters } = useFilters();
  const analytics = useAnalytics();

  if (!dataset || !analytics) return null;

  const allCategories = [...new Set(dataset.transactions.map((t) => t.category))].sort();
  const hasRows = analytics.filtered.length > 0;
  const uncategorized = analytics.categories.find((c) => c.name === "Uncategorized");
  const uncategorizedShare = uncategorized?.contributionPct ?? 0;

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
            <h2 className="text-h1 text-text-900">Category Intelligence</h2>
            <p className="text-small text-text-600">
              How each category contributes to revenue and profit.
            </p>
          </div>

          {uncategorizedShare > UNCATEGORIZED_WARN_SHARE && (
            <div
              role="status"
              className="rounded-lg border border-warning/30 bg-[#FFFBEB] px-4 py-3 text-small text-text-600"
            >
              <strong className="font-medium text-text-900">Category analysis is limited.</strong>{" "}
              {formatPct(uncategorizedShare)} of revenue has no category in your file, so the
              breakdown below covers only part of your business.
            </div>
          )}

          <CategoryCards
            categories={analytics.categories}
            hasCostData={analytics.meta.hasCostData}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ContributionDonut categories={analytics.categories} />
            {/* §12.5.2 — the profit comparison is removed without cost data */}
            {analytics.meta.hasCostData ? (
              <CategoryRevenueProfitChart categories={analytics.categories} />
            ) : (
              <CategoryBar categories={analytics.categories} />
            )}
          </div>

          <CategoryTable
            categories={analytics.categories}
            hasCostData={analytics.meta.hasCostData}
          />
        </div>
      )}
    </>
  );
}

export default function CategoriesPage() {
  return (
    <RequireDataset>
      <CategoriesContent />
    </RequireDataset>
  );
}
