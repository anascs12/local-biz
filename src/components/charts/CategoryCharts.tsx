"use client";

/**
 * Category Intelligence charts — SPEC §9.6.
 *   - Contribution donut (revenue share)
 *   - Grouped bar: revenue vs profit per category
 *
 * The donut is the one place a categorical palette is used, so every slice is
 * ALSO named with its share and value in an adjacent key — identity and
 * magnitude never rest on hue alone (§20.7). Revenue and profit share one axis
 * (both are PKR); a second axis would be a dual-axis chart, which is never used.
 */

import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryMetrics } from "@/types/analytics";
import { formatPKR, formatPKRCompact, formatPct } from "@/lib/utils/format";
import {
  AXIS_PROPS,
  CHART_CATEGORICAL,
  CHART_COLORS,
  ChartCard,
  TooltipShell,
  foldToPalette,
} from "./ChartCard";

export const ContributionDonut = memo(function ContributionDonut({
  categories,
}: {
  categories: CategoryMetrics[];
}) {
  const slices = foldToPalette(categories.map((c) => ({ name: c.name, value: c.revenue })));
  const total = slices.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard
      title="Revenue share by category"
      definition="How much of your total revenue each category contributes."
      series={slices.map((s, i) => ({
        label: s.name,
        color: CHART_CATEGORICAL[i % CHART_CATEGORICAL.length],
      }))}
      height={280}
    >
      <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-40 w-full sm:h-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="#FFFFFF"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { name: string; value: number };
                  return (
                    <TooltipShell
                      label={d.name}
                      rows={[
                        { name: "Revenue", value: formatPKR(d.value) },
                        {
                          name: "Share",
                          value: formatPct(total > 0 ? (d.value / total) * 100 : 0),
                        },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Direct value labels — the donut is never read by color alone */}
        <ul className="flex w-full flex-col gap-1.5 sm:w-1/2">
          {slices.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2 text-caption">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CHART_CATEGORICAL[i % CHART_CATEGORICAL.length] }}
              />
              <span className="truncate text-text-600">{s.name}</span>
              <span className="nums ml-auto shrink-0 font-medium text-text-900">
                {formatPct(total > 0 ? (s.value / total) * 100 : 0)}
              </span>
              <span className="nums hidden shrink-0 text-text-400 sm:inline">
                {formatPKR(s.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
});

export const CategoryRevenueProfitChart = memo(function CategoryRevenueProfitChart({
  categories,
}: {
  categories: CategoryMetrics[];
}) {
  const data = [...categories]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({ name: c.name, revenue: c.revenue, profit: c.profit ?? 0 }));

  return (
    <ChartCard
      title="Revenue vs profit by category"
      definition="Revenue and the profit left after costs, side by side for each category."
      series={[
        { label: "Revenue (Rs.)", color: CHART_COLORS.primary },
        { label: "Profit (Rs.)", color: CHART_COLORS.accent },
      ]}
      height={Math.max(240, data.length * 46 + 40)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
          barGap={2}
        >
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v) => formatPKRCompact(v as number)} />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={110} />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <TooltipShell
                  label={String(label)}
                  rows={payload.map((p) => ({
                    name: p.name === "revenue" ? "Revenue" : "Profit",
                    value: formatPKR(p.value as number),
                    color: p.name === "revenue" ? CHART_COLORS.primary : CHART_COLORS.accent,
                  }))}
                />
              );
            }}
          />
          <Legend
            formatter={(v) => (
              <span className="text-caption text-text-600">{v === "revenue" ? "Revenue" : "Profit"}</span>
            )}
          />
          <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={14} />
          <Bar dataKey="profit" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
