"use client";

/**
 * FilterBar — SPEC §9.3.
 * Sticky under the header: date-range segmented control, category multi-select,
 * and a "Showing X of Y transactions" counter. Filters are global — they feed
 * the single filtered array every metric derives from (§11.4).
 */

import { DATE_PRESET_LABELS, type DatePreset } from "@/context/FilterContext";
import { useDataset } from "@/hooks/useDataset";
import { useFilters } from "@/hooks/useFilters";
import { formatNumber, formatRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// "Custom" needs a date picker (P1, §32) — the presets ship first.
const PRESETS: DatePreset[] = ["7d", "30d", "90d", "ytd", "all"];

export function FilterBar({
  categories,
  shownCount,
  rangeStart,
  rangeEnd,
}: {
  categories: string[];
  shownCount: number;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { dataset } = useDataset();
  const { filters, setDatePreset, setCategories } = useFilters();
  const total = dataset?.validRowCount ?? 0;
  const selected = filters.categories;

  const toggleCategory = (name: string) => {
    if (selected === "all") {
      // First click narrows to everything except the one just switched off.
      setCategories(categories.filter((c) => c !== name));
      return;
    }
    const next = selected.includes(name)
      ? selected.filter((c) => c !== name)
      : [...selected, name];
    setCategories(next.length === 0 || next.length === categories.length ? "all" : next);
  };

  const isCategoryOn = (name: string) => selected === "all" || selected.includes(name);

  return (
    <div className="sticky top-16 z-20 border-b border-border bg-bg-app/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Date range segmented control */}
        <div
          role="group"
          aria-label="Date range"
          className="inline-flex rounded-md border border-border bg-bg-card p-0.5"
        >
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDatePreset(p)}
              aria-pressed={filters.datePreset === p}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-small transition-colors",
                filters.datePreset === p
                  ? "bg-primary-600 font-medium text-white"
                  : "text-text-600 hover:bg-primary-50 hover:text-text-900",
              )}
            >
              {DATE_PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Category multi-select */}
        {categories.length > 1 && (
          <div role="group" aria-label="Categories" className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                aria-pressed={isCategoryOn(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-caption font-medium transition-colors",
                  isCategoryOn(c)
                    ? "border-primary-600/30 bg-primary-50 text-primary-700"
                    : "border-border bg-bg-card text-text-400 hover:text-text-600",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <p className="ml-auto text-caption text-text-400">
          Showing {formatNumber(shownCount)} of {formatNumber(total)} transactions
          <span className="hidden md:inline"> · {formatRange(rangeStart, rangeEnd)}</span>
        </p>
      </div>
    </div>
  );
}
