/**
 * Demo loading — SPEC §14 / F2 / §9.1.
 *
 * One click from the landing page to a fully populated dashboard, in under one
 * second, with NO network request: the CSV is compiled into the bundle and run
 * through the exact same ingestion pipeline as a user upload. That shared path
 * is deliberate — the demo exercises the fuzzy column mapper and validation
 * engine, so a bug there shows up in the demo too.
 */

import type { Dataset } from "@/types/dataset";
import { parseCsvToDataset } from "@/lib/parsing/pipeline";
import { DEMO_DATASET_NAME, URBAN_THREADS_CSV } from "./urbanThreadsData";

let cached: Dataset | null = null;

/** Build (and memoize) the Urban Threads PK demo dataset. */
export function loadDemoDataset(): Dataset {
  if (cached) return cached;
  const { dataset, errors } = parseCsvToDataset(URBAN_THREADS_CSV, {
    name: DEMO_DATASET_NAME,
    isDemo: true,
  });
  if (!dataset) {
    // Should be impossible: the CSV is generated and committed alongside this code.
    throw new Error(`Demo dataset failed to load: ${errors.join("; ")}`);
  }
  cached = dataset;
  return dataset;
}

export { DEMO_DATASET_NAME };
