/**
 * Ingestion pipeline glue — SPEC §11.
 *
 * The UI drives stages 3–4 (detect → user confirms mapping) explicitly, but the
 * demo loader and tests need a one-call path: parse → auto-detect columns →
 * assemble. `buildDatasetAuto` provides that; `parseCsvToDataset` starts from
 * raw CSV text.
 */

import { detectColumns, type ColumnMapping, type RawRow } from "./columnMapper";
import { parseCsvString } from "./csv";
import {
  assembleDataset,
  type AssembleOptions,
  type AssembleResult,
} from "@/lib/validation/datasetValidation";

export interface AutoBuildResult extends AssembleResult {
  mapping: ColumnMapping;
}

/** Detect columns from headers+rows, then assemble a Dataset. */
export function buildDatasetAuto(
  headers: string[],
  rows: RawRow[],
  options: AssembleOptions,
): AutoBuildResult {
  const detection = detectColumns(headers, rows);
  const result = assembleDataset(rows, detection.mapping, options);
  return { ...result, mapping: detection.mapping };
}

/** Parse CSV text end-to-end into a Dataset (used by the bundled demo loader). */
export function parseCsvToDataset(text: string, options: AssembleOptions): AutoBuildResult {
  const { headers, rows } = parseCsvString(text);
  return buildDatasetAuto(headers, rows, options);
}
