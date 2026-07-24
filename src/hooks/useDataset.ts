"use client";

/**
 * useDataset — SPEC §21.3.
 * The dataset half of the global state. Pages read the dataset from here and
 * never hold their own copy.
 *
 * NOTE: this hook deliberately does NOT import the bundled demo module. Doing so
 * would pull the ~37 KB demo CSV into every chunk that touches dataset state.
 * The demo trigger imports `loadDemoDataset` itself and passes the result to
 * `loadDataset`.
 */

import { useDatasetContext } from "@/context/DatasetContext";
import type { Dataset } from "@/types/dataset";

export interface UseDatasetResult {
  dataset: Dataset | null;
  datasetId: string | null;
  /** True once a dataset is loaded. Drives the RequireDataset guard (§8). */
  hasDataset: boolean;
  /** True while the sessionStorage restore is still in flight (§21.2). */
  hydrating: boolean;
  isDemo: boolean;
  loadDataset: (dataset: Dataset) => void;
  clearDataset: () => void;
}

export function useDataset(): UseDatasetResult {
  const { dataset, datasetId, hydrating, loadDataset, clearDataset } = useDatasetContext();
  return {
    dataset,
    datasetId,
    hasDataset: dataset !== null,
    hydrating,
    isDemo: dataset?.isDemo ?? false,
    loadDataset,
    clearDataset,
  };
}
