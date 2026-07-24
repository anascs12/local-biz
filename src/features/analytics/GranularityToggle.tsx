"use client";

/**
 * GranularityToggle — SPEC §9.4 / §13.4.
 * "Granularity is automatic unless the user overrides it on /analytics."
 * The toggle applies to every chart on the page.
 */

import type { Granularity } from "@/types/analytics";
import { cn } from "@/lib/utils/cn";

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function GranularityToggle({
  value,
  auto,
  onChange,
}: {
  value: Granularity;
  /** The automatically chosen granularity, shown so the default is explicable. */
  auto: Granularity;
  onChange: (next: Granularity) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="Chart granularity"
        className="inline-flex rounded-md border border-border bg-bg-card p-0.5"
      >
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              "rounded-sm px-3 py-1.5 text-small transition-colors",
              value === o.value
                ? "bg-primary-600 font-medium text-white"
                : "text-text-600 hover:bg-primary-50 hover:text-text-900",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-caption text-text-400">
        {value === auto
          ? `Chosen automatically for this date range.`
          : `Automatic for this range would be ${auto}.`}
      </p>
    </div>
  );
}
