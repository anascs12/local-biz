"use client";

/**
 * Product Intelligence — SPEC §9.5.
 * Classification filter chips with counts, the visible classification rules,
 * and a table sortable by every numeric column.
 *
 * The product detail drawer and the trend sparkline are P1 (§32) and are added
 * once every P0 item is complete.
 */

import * as React from "react";
import { RequireDataset } from "@/components/layout/RequireDataset";
import { FilterBar } from "@/components/layout/FilterBar";
import { ClassificationChips } from "@/features/products/ClassificationChips";
import { ProductTable } from "@/features/products/ProductTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDataset } from "@/hooks/useDataset";
import { useFilters } from "@/hooks/useFilters";
import type { ProductBadge } from "@/types/analytics";
import { formatNumber } from "@/lib/utils/format";

function ProductsContent() {
  const { dataset } = useDataset();
  const { resetFilters } = useFilters();
  const analytics = useAnalytics();
  const [active, setActive] = React.useState<ProductBadge | "all">("all");

  if (!dataset || !analytics) return null;

  const allCategories = [...new Set(dataset.transactions.map((t) => t.category))].sort();
  const hasRows = analytics.filtered.length > 0;
  const shown =
    active === "all"
      ? analytics.products
      : analytics.products.filter((p) => p.badges.includes(active));

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
        <div className="space-y-5 p-4 md:p-6">
          <div>
            <h2 className="text-h1 text-text-900">Product Intelligence</h2>
            <p className="text-small text-text-600">
              {formatNumber(analytics.products.length)} products in the selected period.
            </p>
          </div>

          <ClassificationChips
            products={analytics.products}
            hasCostData={analytics.meta.hasCostData}
            active={active}
            onChange={setActive}
          />

          <ProductTable products={shown} hasCostData={analytics.meta.hasCostData} />
        </div>
      )}
    </>
  );
}

export default function ProductsPage() {
  return (
    <RequireDataset>
      <ProductsContent />
    </RequireDataset>
  );
}
