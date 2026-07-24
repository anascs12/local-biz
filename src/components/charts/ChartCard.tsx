"use client";

/**
 * ChartCard — shared chart chrome (SPEC §20.1 / §20.5 / §20.7).
 *
 * Every chart carries a title, generous whitespace, and a text key naming each
 * series with its swatch, so identity is never conveyed by color alone (§20.7).
 */

import * as React from "react";
import { Card } from "@/components/ui/Card";
import { InfoTooltip } from "@/components/ui/Tooltip";

export interface ChartSeriesKey {
  label: string;
  color: string;
}

export function ChartCard({
  title,
  definition,
  series,
  note,
  height = 300,
  children,
}: {
  title: string;
  definition?: string;
  series: ChartSeriesKey[];
  note?: string;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1">
          <h3 className="text-h3 text-text-900">{title}</h3>
          {definition && <InfoTooltip content={definition} label={`What is ${title}?`} />}
        </div>
      </div>

      {/* Text key — identity is never color-only (§20.7) */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-caption text-text-600">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div style={{ height }} className="w-full">
        {children}
      </div>

      {note && <p className="mt-2 text-caption text-text-400">{note}</p>}
    </Card>
  );
}

/** Shared tooltip surface — SPEC §20.4 popover elevation. */
export function TooltipShell({
  label,
  rows,
}: {
  label: string;
  rows: { name: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-sm border border-border bg-bg-card px-3 py-2 shadow-popover">
      <p className="mb-1 text-caption font-medium text-text-900">{label}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2 text-caption text-text-600">
          {r.color && (
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: r.color }}
            />
          )}
          <span>{r.name}</span>
          <span className="nums ml-auto font-medium text-text-900">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Design tokens used by charts (§20.2). */
export const CHART_COLORS = {
  primary: "#0F766E",
  accent: "#D97706",
  muted: "#475569",
  grid: "#E2E8F0",
  axis: "#94A3B8",
} as const;

/**
 * Chart categorical palette, in the SPEC's fixed order (§20.2).
 *
 * Assigned in order and NEVER cycled — a 9th series folds into "Other" instead
 * of reusing a hue (see foldToPalette). Note that `#E11D48` and `#65A30D` are a
 * weak pair under deuteranopia, so anything using this palette must also carry
 * text labels with values — which §20.7 requires anyway.
 */
export const CHART_CATEGORICAL = [
  "#0F766E",
  "#D97706",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#65A30D",
  "#E11D48",
  "#475569",
] as const;

/**
 * Keep at most `CHART_CATEGORICAL.length` slices: the largest N−1 by value plus
 * an aggregated "Other". Prevents hue cycling on long category lists.
 */
export function foldToPalette<T extends { name: string; value: number }>(
  items: T[],
): { name: string; value: number }[] {
  const max = CHART_CATEGORICAL.length;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted.map((i) => ({ name: i.name, value: i.value }));
  const head = sorted.slice(0, max - 1).map((i) => ({ name: i.name, value: i.value }));
  const other = sorted.slice(max - 1).reduce((s, i) => s + i.value, 0);
  return [...head, { name: "Other", value: other }];
}

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tick: { fill: CHART_COLORS.axis, fontSize: 12 },
} as const;
