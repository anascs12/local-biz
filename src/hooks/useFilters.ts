"use client";

/**
 * useFilters — SPEC §9.3 / §13.3 / §21.3.
 * Global filters are applied ONCE and every downstream metric derives from the
 * single filtered array (§11.4) — no page re-filters on its own.
 */

import { useMemo } from "react";
import { useDatasetContext } from "@/context/DatasetContext";
import {
  filterHash,
  type CustomRange,
  type DatePreset,
  type Filters,
} from "@/context/FilterContext";

export interface UseFiltersResult {
  filters: Filters;
  /** Stable memo key for the analytics result (§21.3). */
  hash: string;
  setDatePreset: (preset: DatePreset) => void;
  setCustomRange: (range: CustomRange) => void;
  setCategories: (categories: string[] | "all") => void;
  resetFilters: () => void;
}

export function useFilters(): UseFiltersResult {
  const { filters, setFilters, resetFilters } = useDatasetContext();

  const hash = useMemo(() => filterHash(filters), [filters]);

  return {
    filters,
    hash,
    setDatePreset: (preset) =>
      // Leaving "custom" discards the custom range so the two can't disagree.
      setFilters({ datePreset: preset, customRange: preset === "custom" ? filters.customRange : null }),
    setCustomRange: (range) => setFilters({ datePreset: "custom", customRange: range }),
    setCategories: (categories) => setFilters({ categories }),
    resetFilters,
  };
}
