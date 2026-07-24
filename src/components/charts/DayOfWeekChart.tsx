"use client";

/**
 * Day-of-week breakdown — SPEC §9.4 / §13.8.
 *
 * "This is what surfaces the weekend spike." Bars are mean revenue per
 * OCCURRING day, not totals — otherwise weekdays that appear more often in the
 * range would look bigger purely by frequency (§13.8).
 *
 * Weekend bars use the accent hue so the pattern is visible at a glance. That
 * is a two-value encoding, so it ships with a text key naming both groups —
 * the weekday/weekend split is never conveyed by colour alone (§20.7).
 */

import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Patterns } from "@/types/analytics";
import { formatPKR, formatPKRCompact, formatPct } from "@/lib/utils/format";
import { AXIS_PROPS, CHART_COLORS, ChartCard, TooltipShell } from "./ChartCard";

const WEEKEND_DAYS = new Set([0, 6]);

export const DayOfWeekChart = memo(function DayOfWeekChart({
  patterns,
}: {
  patterns: Patterns;
}) {
  // Monday-first reading order, matching the ISO weeks used elsewhere (§13.4).
  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((day) => patterns.dayOfWeek.find((d) => d.day === day))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const data = ordered.map((d) => ({
    label: d.label.slice(0, 3),
    fullLabel: d.label,
    value: d.meanRevenue,
    occurrences: d.occurrences,
    isWeekend: WEEKEND_DAYS.has(d.day),
  }));

  const note =
    patterns.weekendUpliftPct !== null
      ? `Weekends take ${formatPct(patterns.weekendUpliftPct)} ${
          patterns.weekendUpliftPct >= 0 ? "more" : "less"
        } per day than weekdays.`
      : "A weekend comparison needs at least three weekends in the selected range.";

  return (
    <ChartCard
      title="Average revenue by day of week"
      definition="Average revenue per occurring day, so days that appear more often in the range aren't over-counted."
      series={[
        { label: "Weekday", color: CHART_COLORS.primary },
        { label: "Weekend", color: CHART_COLORS.accent },
      ]}
      note={note}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={68} tickFormatter={(v) => formatPKRCompact(v as number)} />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <TooltipShell
                  label={d.fullLabel}
                  rows={[
                    {
                      name: "Average per day",
                      value: formatPKR(d.value),
                      color: d.isWeekend ? CHART_COLORS.accent : CHART_COLORS.primary,
                    },
                    { name: "Days in range", value: String(d.occurrences) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={d.isWeekend ? CHART_COLORS.accent : CHART_COLORS.primary}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
