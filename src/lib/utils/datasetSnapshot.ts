/**
 * sessionStorage snapshot — SPEC §11 (step 8 STORE) / §21.2.
 *
 * "Datasets live in React context for the session and are snapshotted to
 * sessionStorage (capped at 5 MB, gracefully skipped when the dataset is
 * larger) so a page refresh does not lose work."
 *
 * There is NO server persistence and no database (§21.2). JSON.stringify turns
 * Date objects into ISO strings, so reads must revive them — that revival is
 * the only subtle part of this module and is unit-tested.
 */

import type { Dataset } from "@/types/dataset";
import type { Filters } from "@/context/FilterContext";
import { DEFAULT_FILTERS } from "@/context/FilterContext";

const DATASET_KEY = "localbiz.dataset.v1";
const FILTERS_KEY = "localbiz.filters.v1";

/** §21.2 — snapshots larger than this are skipped rather than throwing. */
export const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;

function hasSessionStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    return false;
  }
}

/** Serialize a dataset (Dates become ISO strings via Date.toJSON). */
export function serializeDataset(dataset: Dataset): string {
  return JSON.stringify(dataset);
}

/** Parse a serialized dataset, reviving every Date field. Returns null if unusable. */
export function deserializeDataset(json: string): Dataset | null {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const d = raw as Dataset & {
      dateRange: { start: string | Date; end: string | Date };
    };
    if (!Array.isArray(d.transactions)) return null;

    const transactions = d.transactions.map((t) => ({
      ...t,
      date: new Date(t.date as unknown as string),
    }));
    if (transactions.some((t) => Number.isNaN(t.date.getTime()))) return null;

    const start = new Date(d.dateRange.start);
    const end = new Date(d.dateRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

    return { ...(d as Dataset), transactions, dateRange: { start, end } };
  } catch {
    return null;
  }
}

/** Persist the dataset. Silently skipped when oversized or storage is unavailable. */
export function saveDatasetSnapshot(dataset: Dataset): void {
  if (!hasSessionStorage()) return;
  try {
    const json = serializeDataset(dataset);
    if (json.length > MAX_SNAPSHOT_BYTES) return; // §21.2 graceful skip
    window.sessionStorage.setItem(DATASET_KEY, json);
  } catch {
    // Quota or serialization failure is non-fatal — the in-memory dataset is authoritative.
  }
}

export function saveFiltersSnapshot(filters: Filters): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    /* non-fatal */
  }
}

export function loadDatasetSnapshot(): Dataset | null {
  if (!hasSessionStorage()) return null;
  try {
    const json = window.sessionStorage.getItem(DATASET_KEY);
    return json ? deserializeDataset(json) : null;
  } catch {
    return null;
  }
}

export function loadFiltersSnapshot(): Filters {
  if (!hasSessionStorage()) return DEFAULT_FILTERS;
  try {
    const json = window.sessionStorage.getItem(FILTERS_KEY);
    if (!json) return DEFAULT_FILTERS;
    const parsed = JSON.parse(json) as Partial<Filters>;
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function clearSnapshot(): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(DATASET_KEY);
    window.sessionStorage.removeItem(FILTERS_KEY);
  } catch {
    /* non-fatal */
  }
}
