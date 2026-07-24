"use client";

/**
 * KpiGrid — SPEC §9.3.
 * Six cards: Total Revenue · Total Profit · Profit Margin · Total Orders ·
 * Units Sold · Growth Rate. Grid goes 6 → 3 → 2 columns (§20.6).
 *
 * Profit and Margin render disabled with an explanation when hasCostData is
 * false — never a zero, never an estimate (§12.5).
 */

import type { AnalyticsResult } from "@/types/analytics";
import { KpiCard } from "./KpiCard";
import { formatNumber, formatPKR, formatPct } from "@/lib/utils/format";

const NO_COST_NOTE = "Add a cost column to unlock profit analysis";

export function KpiGrid({ analytics }: { analytics: AnalyticsResult }) {
  const { kpis, deltas, meta } = analytics;
  const hasCost = meta.hasCostData;

  // §13.1 — when cost coverage is partial, both figures carry this footnote.
  const costFootnote =
    hasCost && kpis.costedTransactionCount < kpis.transactionCount
      ? `Based on ${formatNumber(kpis.costedTransactionCount)} of ${formatNumber(kpis.transactionCount)} transactions that include cost data`
      : undefined;

  const growthValue =
    kpis.growthRatePct !== null
      ? formatPct(kpis.growthRatePct)
      : kpis.growthUnavailableReason === "zero_baseline"
        ? "N/A"
        : "Not enough data";

  const growthNote =
    kpis.growthRatePct !== null
      ? undefined
      : kpis.growthUnavailableReason === "zero_baseline"
        ? "No revenue in the earlier period"
        : "Needs at least 14 days of data";

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        label="Total Revenue"
        value={formatPKR(kpis.totalRevenue)}
        definition="The total value of all sales in the selected period, before costs."
        deltaPct={deltas.revenuePct}
      />
      <KpiCard
        label="Total Profit"
        value={formatPKR(kpis.totalProfit)}
        definition="Revenue minus the cost of the items you sold, for rows that include a cost."
        deltaPct={deltas.profitPct}
        disabled={!hasCost}
        disabledNote={NO_COST_NOTE}
        footnote={costFootnote}
      />
      <KpiCard
        label="Profit Margin"
        value={formatPct(kpis.profitMarginPct)}
        definition="Profit as a share of revenue — how much of each rupee of sales you keep."
        deltaPoints={deltas.marginPointDelta}
        disabled={!hasCost}
        disabledNote={NO_COST_NOTE}
        footnote={costFootnote}
      />
      <KpiCard
        label="Total Orders"
        value={formatNumber(kpis.totalOrders)}
        definition="The number of separate sales. Each row counts as one order when your file has no order ID column."
        deltaPct={deltas.ordersPct}
      />
      <KpiCard
        label="Units Sold"
        value={formatNumber(kpis.unitsSold)}
        definition="The total quantity of items sold across all orders."
        deltaPct={deltas.unitsPct}
      />
      <KpiCard
        label="Growth Rate"
        value={growthValue}
        definition="How revenue in the second half of this period compares with the first half."
        footnote={growthNote}
      />
    </div>
  );
}
