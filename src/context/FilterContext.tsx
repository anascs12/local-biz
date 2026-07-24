/**
 * Global filter domain — SPEC §9.3 / §13.3 / §16.
 *
 * NOTE ON STRUCTURE: §29 lists this file alongside DatasetContext.tsx, but
 * §21.3 is explicit that the *DatasetProvider* "holds Dataset | null, filters,
 * and the dispatchers" — the app has exactly one piece of global state. So this
 * module owns the filter TYPE, defaults and pure helpers, and the single
 * DatasetProvider owns the state itself. A second React context would be the
 * ceremony §21.1 rejects.
 */

/** Date range presets from the dashboard filter bar (§9.3). */
export type DatePreset = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

export interface CustomRange {
  /** ISO date (YYYY-MM-DD) */
  start: string;
  /** ISO date (YYYY-MM-DD) */
  end: string;
}

export interface Filters {
  datePreset: DatePreset;
  /** Only meaningful when datePreset === "custom". */
  customRange: CustomRange | null;
  /** "all" or an explicit list of category names (§16 appliedFilters.categories). */
  categories: string[] | "all";
}

export const DEFAULT_FILTERS: Filters = {
  datePreset: "all",
  customRange: null,
  categories: "all",
};

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "This year",
  all: "All time",
  custom: "Custom",
};

/**
 * Stable key for memoizing the analytics result on (datasetId, filterHash)
 * (§21.3). Category order must not change the hash.
 */
export function filterHash(f: Filters): string {
  const categories =
    f.categories === "all" ? "all" : [...f.categories].sort().join(",");
  const range = f.customRange ? `${f.customRange.start}_${f.customRange.end}` : "none";
  return `${f.datePreset}|${range}|${categories}`;
}
