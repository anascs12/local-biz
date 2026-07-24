"use client";

/**
 * DatasetProvider — SPEC §21.3.
 * Holds `Dataset | null`, the filters, and the dispatchers. Wraps the app.
 *
 * Storage is in-memory for the session plus a sessionStorage snapshot (§21.2).
 * There is no database and no network persistence: the user's transaction data
 * never leaves the browser.
 */

import * as React from "react";
import type { Dataset } from "@/types/dataset";
import { DEFAULT_FILTERS, type Filters } from "./FilterContext";
import {
  datasetReducer,
  initialDatasetState,
  newDatasetId,
  type DatasetState,
} from "./datasetReducer";
import {
  clearSnapshot,
  loadDatasetSnapshot,
  loadFiltersSnapshot,
  saveDatasetSnapshot,
  saveFiltersSnapshot,
} from "@/lib/utils/datasetSnapshot";

export interface DatasetContextValue extends DatasetState {
  loadDataset: (dataset: Dataset) => void;
  clearDataset: () => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
}

const DatasetContext = React.createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(datasetReducer, initialDatasetState);

  // Restore a snapshot once on mount so a refresh does not lose work (§21.2).
  React.useEffect(() => {
    const restored = loadDatasetSnapshot();
    if (restored) {
      dispatch({
        type: "RESTORE",
        dataset: restored,
        id: newDatasetId(),
        filters: loadFiltersSnapshot(),
      });
    } else {
      dispatch({ type: "HYDRATION_DONE" });
    }
  }, []);

  // Persist the dataset only when it actually changes — re-serializing a large
  // transaction array on every filter click would blow the §25 200ms budget.
  React.useEffect(() => {
    if (state.hydrating) return;
    if (state.dataset) saveDatasetSnapshot(state.dataset);
    else clearSnapshot();
  }, [state.datasetId, state.hydrating]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filters are tiny; persist them on every change.
  React.useEffect(() => {
    if (state.hydrating || !state.dataset) return;
    saveFiltersSnapshot(state.filters);
  }, [state.filters, state.hydrating, state.dataset]);

  const value = React.useMemo<DatasetContextValue>(
    () => ({
      ...state,
      loadDataset: (dataset: Dataset) =>
        dispatch({ type: "LOAD", dataset, id: newDatasetId() }),
      clearDataset: () => dispatch({ type: "CLEAR" }),
      setFilters: (patch: Partial<Filters>) => dispatch({ type: "SET_FILTERS", patch }),
      resetFilters: () => dispatch({ type: "RESET_FILTERS" }),
    }),
    [state],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

/** Internal accessor — pages should use useDataset() / useFilters(). */
export function useDatasetContext(): DatasetContextValue {
  const ctx = React.useContext(DatasetContext);
  if (!ctx) {
    throw new Error("useDatasetContext must be used inside a <DatasetProvider>.");
  }
  return ctx;
}

export { DEFAULT_FILTERS };
