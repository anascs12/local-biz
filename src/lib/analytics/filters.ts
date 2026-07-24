/**
 * Global filtering — SPEC §9.3 / §11.4.
 *
 * "Filtering runs once per change and every downstream metric derives from the
 * single filtered array — never re-filter inside individual chart components."
 *
 * ANCHOR DECISION: the relative presets (7d/30d/90d/This year) are anchored to
 * the LATEST DATE IN THE DATASET, not to today. The SPEC does not state an
 * anchor. Anchoring to today would show an empty dashboard for any historical
 * export — including the bundled demo, which ends 2026-01-31 — and that would
 * break the §9.1/persona-3 requirement that the demo load a fully populated
 * dashboard. "Last 30 days" therefore means the most recent 30 days OF YOUR
 * DATA, which is also what a shop owner means by it.
 */

import type { Transaction } from "@/types/transaction";
import type { DateWindow } from "@/types/analytics";
import type { Filters } from "@/context/FilterContext";
import { addDays, daysInclusive, startOfDay } from "@/lib/utils/dates";

export interface DatasetBounds {
  min: Date;
  max: Date;
}

function makeWindow(start: Date, end: Date): DateWindow {
  const s = startOfDay(start);
  const e = startOfDay(end);
  return { start: s, end: e, days: daysInclusive(s, e) };
}

/** Resolve the active date window from the filters and the dataset bounds. */
export function resolveDateWindow(filters: Filters, bounds: DatasetBounds): DateWindow {
  const anchor = startOfDay(bounds.max);
  const min = startOfDay(bounds.min);

  switch (filters.datePreset) {
    case "7d":
      return makeWindow(addDays(anchor, -6), anchor);
    case "30d":
      return makeWindow(addDays(anchor, -29), anchor);
    case "90d":
      return makeWindow(addDays(anchor, -89), anchor);
    case "ytd":
      return makeWindow(new Date(anchor.getFullYear(), 0, 1), anchor);
    case "custom": {
      if (!filters.customRange) return makeWindow(min, anchor);
      const start = new Date(`${filters.customRange.start}T00:00:00`);
      const end = new Date(`${filters.customRange.end}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return makeWindow(min, anchor);
      }
      return makeWindow(start, end);
    }
    case "all":
    default:
      return makeWindow(min, anchor);
  }
}

/** Compute min/max transaction dates. Returns null for an empty array. */
export function datasetBounds(transactions: Transaction[]): DatasetBounds | null {
  if (transactions.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const t of transactions) {
    const ms = t.date.getTime();
    if (ms < min) min = ms;
    if (ms > max) max = ms;
  }
  return { min: new Date(min), max: new Date(max) };
}

/**
 * Apply date window + category filters in a single pass (§11.4).
 * Date comparison is inclusive on both ends at local-midnight granularity.
 */
export function applyFilters(
  transactions: Transaction[],
  window: DateWindow,
  categories: string[] | "all",
): Transaction[] {
  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  const catSet = categories === "all" ? null : new Set(categories);

  const out: Transaction[] = [];
  for (const t of transactions) {
    const ms = startOfDay(t.date).getTime();
    if (ms < startMs || ms > endMs) continue;
    if (catSet && !catSet.has(t.category)) continue;
    out.push(t);
  }
  return out;
}
