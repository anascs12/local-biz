"use client";

/**
 * Category highlight cards — SPEC §9.6.
 * Best category (revenue) · Most profitable · Fastest growing · Declining.
 *
 * A card is only rendered when the underlying metric actually exists: the
 * profit card needs cost data (§12.5), and the growth/decline cards need a
 * computable trend (§13.5). Nothing is estimated to fill a slot.
 */

import { Card } from "@/components/ui/Card";
import type { CategoryMetrics } from "@/types/analytics";
import { formatPKR, formatPct } from "@/lib/utils/format";

function HighlightCard({
  label,
  name,
  detail,
  tone,
}: {
  label: string;
  name: string;
  detail: string;
  tone?: "success" | "error";
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-small font-medium uppercase tracking-wide text-text-400">{label}</span>
      <span className="text-h2 text-text-900">{name}</span>
      <span
        className={
          tone === "success"
            ? "nums text-small text-success"
            : tone === "error"
              ? "nums text-small text-error"
              : "nums text-small text-text-600"
        }
      >
        {detail}
      </span>
    </Card>
  );
}

export function CategoryCards({
  categories,
  hasCostData,
}: {
  categories: CategoryMetrics[];
  hasCostData: boolean;
}) {
  if (categories.length === 0) return null;

  const byRevenue = [...categories].sort((a, b) => b.revenue - a.revenue)[0];

  const profitable = hasCostData
    ? [...categories]
        .filter((c) => c.profit !== null)
        .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))[0]
    : undefined;

  const withTrend = categories.filter((c) => c.trendPct !== null);
  const growing = [...withTrend].sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0))[0];
  const declining = [...withTrend].sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0))[0];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HighlightCard
        label="Best category"
        name={byRevenue.name}
        detail={`${formatPKR(byRevenue.revenue)} · ${formatPct(byRevenue.contributionPct)} of revenue`}
      />
      {profitable && (
        <HighlightCard
          label="Most profitable"
          name={profitable.name}
          detail={`${formatPKR(profitable.profit)} profit · ${formatPct(profitable.marginPct)} margin`}
        />
      )}
      {growing && growing.trendPct !== null && growing.trendPct > 0 && (
        <HighlightCard
          label="Fastest growing"
          name={growing.name}
          detail={`${formatPct(growing.trendPct)} trend across the period`}
          tone="success"
        />
      )}
      {declining && declining.trendPct !== null && declining.trendPct < 0 && (
        <HighlightCard
          label="Declining"
          name={declining.name}
          detail={`${formatPct(declining.trendPct)} trend across the period`}
          tone="error"
        />
      )}
    </div>
  );
}
