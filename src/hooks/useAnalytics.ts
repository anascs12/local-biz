"use client";

/**
 * useAnalytics — SPEC §21.3.
 *
 * "The single hook every page uses. Reads dataset + filters from context,
 * applies filters once, runs the analytics functions, memoizes the whole result
 * on (datasetId, filterHash). Pages consume computed values; no page computes
 * its own metric."
 */

import { useMemo } from "react";
import { useDatasetContext } from "@/context/DatasetContext";
import { filterHash } from "@/context/FilterContext";
import { computeAnalytics } from "@/lib/analytics";
import type { AnalyticsResult } from "@/types/analytics";

export function useAnalytics(): AnalyticsResult | null {
  const { dataset, datasetId, filters } = useDatasetContext();
  const hash = filterHash(filters);

  return useMemo(
    () => (dataset ? computeAnalytics(dataset, filters) : null),
    // Memo key is (datasetId, filterHash) per §21.3 — `filters` is recreated on
    // every dispatch, so hashing it keeps the expensive recompute from re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datasetId, hash],
  );
}
