"use client";

/**
 * Revenue and Profit over time — SPEC §9.3 charts 1 & 2.
 *
 * Both are single-measure charts on a single axis (never a dual axis). The
 * profit chart is REMOVED FROM THE DOM entirely when there is no cost data —
 * the caller must not render it (§12.5.2).
 *
 * Empty buckets arrive as zeros from the analytics layer, so gaps show as real
 * dips rather than being connected across (§13.4).
 */

import { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Granularity, TimeSeries } from "@/types/analytics";
import { formatPKR, formatPKRCompact, formatPeriod } from "@/lib/utils/format";
import { AXIS_PROPS, CHART_COLORS, ChartCard, TooltipShell } from "./ChartCard";

interface Point {
  period: string;
  label: string;
  revenue: number;
  profit: number | null;
}

function toPoints(ts: TimeSeries): Point[] {
  return ts.points.map((p) => ({
    period: p.period,
    label: formatPeriod(p.period, ts.granularity),
    revenue: p.revenue,
    profit: p.profit,
  }));
}

const granularityNoun: Record<Granularity, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

function CurrencyTooltip({
  active,
  payload,
  label,
  name,
  color,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  name: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell
      label={String(label)}
      rows={[{ name, value: formatPKR(payload[0].value), color }]}
    />
  );
}

export const RevenueChart = memo(function RevenueChart({ timeSeries }: { timeSeries: TimeSeries }) {
  const data = toPoints(timeSeries);
  return (
    <ChartCard
      title="Revenue over time"
      definition={`Total sales value per ${granularityNoun[timeSeries.granularity]} in the selected period.`}
      series={[{ label: "Revenue (Rs.)", color: CHART_COLORS.primary }]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.18} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
          <YAxis {...AXIS_PROPS} width={68} tickFormatter={(v) => formatPKRCompact(v as number)} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1 }}
            content={<CurrencyTooltip name="Revenue" color={CHART_COLORS.primary} />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#revenueFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});

/**
 * Generic single-measure trend line — SPEC §9.4.
 * Orders, units and AOV all share one axis and one hue; the title names the
 * measure, so identity never rests on colour.
 */
export const MetricTrendChart = memo(function MetricTrendChart({
  timeSeries,
  metric,
  title,
  definition,
  seriesLabel,
  color,
  format,
}: {
  timeSeries: TimeSeries;
  metric: "orders" | "units" | "averageOrderValue";
  title: string;
  definition: string;
  seriesLabel: string;
  color: string;
  format: (v: number) => string;
}) {
  const data = timeSeries.points.map((p) => ({
    label: formatPeriod(p.period, timeSeries.granularity),
    value: p[metric],
  }));

  return (
    <ChartCard title={title} definition={definition} series={[{ label: seriesLabel, color }]}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
          <YAxis {...AXIS_PROPS} width={68} tickFormatter={(v) => format(v as number)} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <TooltipShell
                  label={String(label)}
                  rows={[{ name: seriesLabel, value: format(payload[0].value as number), color }]}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});

export const ProfitChart = memo(function ProfitChart({ timeSeries }: { timeSeries: TimeSeries }) {
  const data = toPoints(timeSeries);
  return (
    <ChartCard
      title="Profit over time"
      definition={`Revenue minus cost per ${granularityNoun[timeSeries.granularity]}, for rows that include a cost.`}
      series={[{ label: "Profit (Rs.)", color: CHART_COLORS.accent }]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
          <YAxis {...AXIS_PROPS} width={68} tickFormatter={(v) => formatPKRCompact(v as number)} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1 }}
            content={<CurrencyTooltip name="Profit" color={CHART_COLORS.accent} />}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke={CHART_COLORS.accent}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
