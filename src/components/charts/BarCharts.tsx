"use client";

/**
 * Horizontal bar charts — SPEC §9.3 charts 3, 4 and 5.
 *   3. Sales by category (sorted desc)
 *   4. Top 10 products by revenue
 *   5. Bottom 10 products by revenue (muted color)
 *
 * These encode ONE measure (revenue) against a labelled category axis, so all
 * bars share a single hue — the axis label carries identity, not the color.
 * Painting each bar a different hue would be a rainbow with no meaning.
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
import type { CategoryMetrics, ProductMetrics } from "@/types/analytics";
import { formatPKR, formatPKRCompact, formatNumber } from "@/lib/utils/format";
import { AXIS_PROPS, CHART_COLORS, ChartCard, TooltipShell } from "./ChartCard";

interface BarDatum {
  name: string;
  value: number;
  units?: number;
}

function truncate(s: string, max = 18): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function BarTooltip({
  active,
  payload,
  color,
  valueLabel,
}: {
  active?: boolean;
  payload?: { payload: BarDatum }[];
  color: string;
  valueLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [{ name: valueLabel, value: formatPKR(d.value), color }];
  if (typeof d.units === "number") {
    rows.push({ name: "Units", value: formatNumber(d.units), color });
  }
  return <TooltipShell label={d.name} rows={rows} />;
}

function HorizontalBars({
  data,
  color,
  valueLabel,
}: {
  data: BarDatum[];
  color: string;
  valueLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        barCategoryGap={6}
      >
        <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
        <XAxis
          type="number"
          {...AXIS_PROPS}
          tickFormatter={(v) => formatPKRCompact(v as number)}
        />
        <YAxis
          type="category"
          dataKey="name"
          {...AXIS_PROPS}
          width={132}
          tickFormatter={(v) => truncate(String(v))}
        />
        <Tooltip
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
          content={<BarTooltip color={color} valueLabel={valueLabel} />}
        />
        {/* 4px rounded data-end, anchored to the baseline */}
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d) => (
            <Cell key={d.name} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const CategoryBar = memo(function CategoryBar({
  categories,
}: {
  categories: CategoryMetrics[];
}) {
  const data: BarDatum[] = [...categories]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({ name: c.name, value: c.revenue, units: c.unitsSold }));

  return (
    <ChartCard
      title="Sales by category"
      definition="Total revenue for each product category in the selected period."
      series={[{ label: "Revenue (Rs.)", color: CHART_COLORS.primary }]}
      height={Math.max(220, data.length * 34 + 40)}
    >
      <HorizontalBars data={data} color={CHART_COLORS.primary} valueLabel="Revenue" />
    </ChartCard>
  );
});

export const TopProductsChart = memo(function TopProductsChart({
  products,
  variant,
}: {
  products: ProductMetrics[];
  variant: "top" | "bottom";
}) {
  const sorted = [...products].sort((a, b) =>
    variant === "top" ? b.revenue - a.revenue : a.revenue - b.revenue,
  );
  const data: BarDatum[] = sorted
    .slice(0, 10)
    // Keep the biggest bar at the top in both variants.
    .sort((a, b) => b.revenue - a.revenue)
    .map((p) => ({ name: p.name, value: p.revenue, units: p.unitsSold }));

  const color = variant === "top" ? CHART_COLORS.primary : CHART_COLORS.muted;

  return (
    <ChartCard
      title={variant === "top" ? "Top 10 products by revenue" : "Bottom 10 products by revenue"}
      definition={
        variant === "top"
          ? "Your ten highest-earning products in the selected period."
          : "Your ten lowest-earning products in the selected period."
      }
      series={[{ label: "Revenue (Rs.)", color }]}
      height={Math.max(220, data.length * 34 + 40)}
    >
      <HorizontalBars data={data} color={color} valueLabel="Revenue" />
    </ChartCard>
  );
});
