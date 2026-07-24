"use client";

/**
 * TrendSummaryStrip — SPEC §9.4.
 * "A summary strip above the charts states period growth rates for revenue,
 * orders, and AOV."
 *
 * Growth compares the first half of the selected range with the second (§13.2),
 * so it answers "is this period trending up?" — a different question from the
 * dashboard's period-over-period deltas, and labelled as such.
 */

import { Card } from "@/components/ui/Card";
import { InfoTooltip } from "@/components/ui/Tooltip";
import type { PeriodGrowth } from "@/lib/analytics/kpis";
import { formatDelta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function GrowthStat({
  label,
  value,
  definition,
  unavailable,
  note,
}: {
  label: string;
  value: number | null;
  definition: string;
  unavailable: string;
  note?: string;
}) {
  const positive = value !== null && value > 0;
  const negative = value !== null && value < 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-small font-medium uppercase tracking-wide text-text-400">
          {label}
        </span>
        <InfoTooltip content={definition} label={`What is ${label}?`} />
      </div>
      {value === null ? (
        <span className="text-small text-text-400">{unavailable}</span>
      ) : (
        <span
          className={cn(
            "nums text-kpi",
            positive ? "text-success" : negative ? "text-error" : "text-text-900",
          )}
        >
          {formatDelta(value)}
        </span>
      )}
      {note && <span className="text-caption text-text-400">{note}</span>}
    </div>
  );
}

export function TrendSummaryStrip({
  growth,
  hasOrderIds,
}: {
  growth: PeriodGrowth;
  hasOrderIds: boolean;
}) {
  const unavailable =
    growth.reason === "insufficient_days"
      ? "Needs 14+ days"
      : growth.reason === "zero_baseline"
        ? "No earlier revenue"
        : "Not available";

  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GrowthStat
          label="Revenue growth"
          value={growth.revenuePct}
          unavailable={unavailable}
          definition="How revenue in the second half of this period compares with the first half."
        />
        <GrowthStat
          label="Orders growth"
          value={growth.ordersPct}
          unavailable={unavailable}
          definition="How the number of orders in the second half compares with the first half."
        />
        <GrowthStat
          label="AOV growth"
          value={growth.aovPct}
          unavailable={unavailable}
          definition="Average order value — revenue divided by the number of orders."
          // §9.4 — the note is required when there is no order ID column.
          note={
            hasOrderIds
              ? undefined
              : "Calculated per transaction — your file has no order ID column, so each row is treated as one order."
          }
        />
      </div>
    </Card>
  );
}
