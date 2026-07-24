/**
 * Dataset + filter state machine — SPEC §21.3.
 *
 * "React Context + useReducer. The app has exactly one piece of global state
 * (the dataset + filters). Redux/Zustand would be ceremony."
 *
 * This module is deliberately pure and framework-free so the transitions can be
 * unit-tested without rendering anything. IDs are supplied by the caller rather
 * than generated here, to keep the reducer pure under React strict mode.
 */

import type { Dataset } from "@/types/dataset";
import { DEFAULT_FILTERS, type Filters } from "./FilterContext";

export interface DatasetState {
  dataset: Dataset | null;
  /** Changes on every load; the memo key for useAnalytics (§21.3). */
  datasetId: string | null;
  filters: Filters;
  /** True until the sessionStorage restore attempt has completed. */
  hydrating: boolean;
}

export type DatasetAction =
  | { type: "LOAD"; dataset: Dataset; id: string }
  | { type: "RESTORE"; dataset: Dataset; id: string; filters: Filters }
  | { type: "HYDRATION_DONE" }
  | { type: "CLEAR" }
  | { type: "SET_FILTERS"; patch: Partial<Filters> }
  | { type: "RESET_FILTERS" };

export const initialDatasetState: DatasetState = {
  dataset: null,
  datasetId: null,
  filters: DEFAULT_FILTERS,
  hydrating: true,
};

export function datasetReducer(state: DatasetState, action: DatasetAction): DatasetState {
  switch (action.type) {
    case "LOAD":
      // A new dataset resets filters — old category/date selections rarely apply.
      return {
        dataset: action.dataset,
        datasetId: action.id,
        filters: DEFAULT_FILTERS,
        hydrating: false,
      };
    case "RESTORE":
      return {
        dataset: action.dataset,
        datasetId: action.id,
        filters: action.filters,
        hydrating: false,
      };
    case "HYDRATION_DONE":
      return state.hydrating ? { ...state, hydrating: false } : state;
    case "CLEAR":
      return { dataset: null, datasetId: null, filters: DEFAULT_FILTERS, hydrating: false };
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.patch } };
    case "RESET_FILTERS":
      return { ...state, filters: DEFAULT_FILTERS };
    default:
      return state;
  }
}

/** Opaque id for memo keying. */
export function newDatasetId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
