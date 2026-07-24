"use client";

/**
 * KpiCard — SPEC §20.5 / §9.3.
 * Label (13px, text-400, uppercase tracking-wide), value (32px tabular), delta
 * pill (12px, colored bg tint), optional ⓘ tooltip.
 *
 * When `disabled` (no cost data) the card renders an explanation instead of a
 * value — it never shows a zero or an estimate (§12.5).
 */

import { Card } from "@/components/ui/Card";
import { InfoTooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";
import { formatDelta } from "@/lib/utils/format";

export interface KpiCardProps {
  label: string;
  value: string;
  /** One-sentence definition, shown via the ⓘ tooltip (§4.1 G1). */
  definition: string;
  deltaPct?: number | null;
  /** Percentage-point delta (margin) instead of a % change. */
  deltaPoints?: number | null;
  /** For metrics where a decrease is good. */
  invertDelta?: boolean;
  disabled?: boolean;
  disabledNote?: string;
  footnote?: string;
}

function DeltaPill({
  value,
  suffix,
  invert,
}: {
  value: number;
  suffix: string;
  invert: boolean;
}) {
  const positive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-caption font-medium nums",
        neutral
          ? "bg-[#F1F5F9] text-text-600"
          : positive
            ? "bg-[#ECFDF5] text-success"
            : "bg-[#FEF2F2] text-error",
      )}
    >
      <span aria-hidden="true">{value > 0 ? "▲" : value < 0 ? "▼" : "—"}</span>
      {suffix}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  definition,
  deltaPct,
  deltaPoints,
  invertDelta = false,
  disabled = false,
  disabledNote,
  footnote,
}: KpiCardProps) {
  return (
    <Card className={cn("flex flex-col gap-1", disabled && "bg-bg-app")}>
      <div className="flex items-center gap-1">
        <span className="text-small font-medium uppercase tracking-wide text-text-400">
          {label}
        </span>
        <InfoTooltip content={disabled && disabledNote ? disabledNote : definition} label={`What is ${label}?`} />
      </div>

      {disabled ? (
        <p className="mt-1 text-small text-text-400">{disabledNote}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="nums text-kpi text-text-900">{value}</span>
            {typeof deltaPct === "number" && Number.isFinite(deltaPct) && (
              <DeltaPill value={deltaPct} suffix={formatDelta(deltaPct)} invert={invertDelta} />
            )}
            {typeof deltaPoints === "number" && Number.isFinite(deltaPoints) && (
              <DeltaPill
                value={deltaPoints}
                suffix={`${deltaPoints > 0 ? "+" : deltaPoints < 0 ? "−" : ""}${Math.abs(deltaPoints).toFixed(1)} pts`}
                invert={invertDelta}
              />
            )}
          </div>
          {footnote && <p className="text-caption text-text-400">{footnote}</p>}
        </>
      )}
    </Card>
  );
}
