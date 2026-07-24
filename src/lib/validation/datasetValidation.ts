/**
 * Dataset-level validation + assembly — SPEC §12.2 / §10.2 / §10.3 / §12.4.
 *
 * Takes raw rows + a confirmed column mapping and produces a `Dataset`, or the
 * blocking errors that prevent one. This is the single place the dataset flags
 * (hasCostData, hasOrderIds, hasCategories) are computed.
 */

import type { Dataset } from "@/types/dataset";
import type { ValidationIssue, ValidationIssueCode } from "@/types/validation";
import type { ColumnMapping, RawRow } from "@/lib/parsing/columnMapper";
import { REQUIRED_FIELDS, FIELD_SPEC_BY_NAME, type InternalField } from "@/lib/parsing/schema";
import { validateRows, type RowValidationOptions } from "./rowValidation";
import { DATASET_ERRORS, ISSUE_META } from "./messages";

/** §10.3 — hasCostData threshold: ≥ 80% of rows have a valid, non-zero cost. */
export const COST_DATA_THRESHOLD = 0.8;
const ORDER_ID_THRESHOLD = 0.9;
const UNCATEGORIZED_WARN_SHARE = 0.5;
const MIN_DISTINCT_DAYS = 14;

export interface MappingValidation {
  ok: boolean;
  missing: { field: InternalField; label: string }[];
  errors: string[];
}

/** §12.2 — all four required fields must be mapped. */
export function validateMapping(mapping: ColumnMapping): MappingValidation {
  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f]).map((f) => ({
    field: f,
    label: FIELD_SPEC_BY_NAME[f].label,
  }));
  return {
    ok: missing.length === 0,
    missing,
    errors: missing.map((m) => DATASET_ERRORS.missingRequired(m.label)),
  };
}

export interface AssembleOptions extends RowValidationOptions {
  name: string;
  isDemo?: boolean;
}

export interface AssembleResult {
  dataset: Dataset | null;
  /** Blocking dataset-level errors (§12.2). Empty when a dataset was produced. */
  errors: string[];
  /** Extra metrics the AI context / analytics layers and the upload UI reuse. */
  meta: {
    costCoveragePct: number;
    distinctDays: number;
    /** True when day/month order could not be determined and DD/MM was assumed (§11.2). */
    dateFormatAmbiguous: boolean;
    /** The day/month order actually used, so the UI can offer the switch (§11.2). */
    dayFirst: boolean;
    duplicateCount: number;
  } | null;
}

function datasetWarning(
  code: ValidationIssueCode,
  count: number,
  extra?: number,
): ValidationIssue {
  const meta = ISSUE_META[code];
  return { code, severity: meta.severity, message: meta.message(count, extra), count, exampleRows: [] };
}

export function assembleDataset(
  rawRows: RawRow[],
  mapping: ColumnMapping,
  options: AssembleOptions,
): AssembleResult {
  // §12.2 — required fields.
  const mv = validateMapping(mapping);
  if (!mv.ok) return { dataset: null, errors: mv.errors, meta: null };

  const rowResult = validateRows(rawRows, mapping, options);
  const { transactions, validRowCount } = rowResult;

  // §12.2 — at least one valid row must survive.
  if (validRowCount === 0) {
    return { dataset: null, errors: [DATASET_ERRORS.noValidRows()], meta: null };
  }

  // ── Flags (§10.2 / §10.3) ──
  const costMapped = mapping.cost !== null;
  const validCostRows = transactions.filter((t) => t.cost !== null && t.cost > 0).length;
  const costCoverage = costMapped ? validCostRows / validRowCount : 0;
  const hasCostData = costMapped && costCoverage >= COST_DATA_THRESHOLD;

  const orderIdRows = transactions.filter((t) => t.order_id !== null).length;
  const hasOrderIds = mapping.order_id !== null && orderIdRows / validRowCount >= ORDER_ID_THRESHOLD;

  const uncategorized = transactions.filter((t) => t.category === "Uncategorized").length;
  const uncatShare = uncategorized / validRowCount;
  const hasCategories = mapping.category !== null && uncatShare < 1;

  // ── Date range + distinct days ──
  let minT = Infinity;
  let maxT = -Infinity;
  const days = new Set<string>();
  for (const t of transactions) {
    const ms = t.date.getTime();
    if (ms < minT) minT = ms;
    if (ms > maxT) maxT = ms;
    days.add(`${t.date.getFullYear()}-${t.date.getMonth()}-${t.date.getDate()}`);
  }
  const distinctDays = days.size;

  // ── Dataset-level warnings (§12.4) ──
  const issues: ValidationIssue[] = [...rowResult.issues];
  if (hasCostData && costCoverage < 1) {
    issues.push(datasetWarning("low_cost_coverage", validRowCount - validCostRows, Math.round(costCoverage * 100)));
  }
  if (distinctDays < MIN_DISTINCT_DAYS) {
    issues.push(datasetWarning("few_distinct_days", distinctDays));
  }
  if (uncatShare > UNCATEGORIZED_WARN_SHARE) {
    issues.push(datasetWarning("mostly_uncategorized", uncategorized));
  }

  const dataset: Dataset = {
    name: options.name,
    isDemo: options.isDemo ?? false,
    transactions,
    hasCostData,
    hasOrderIds,
    hasCategories,
    dateRange: { start: new Date(minT), end: new Date(maxT) },
    validRowCount,
    skippedRowCount: rowResult.skippedRowCount,
    issues,
  };

  return {
    dataset,
    errors: [],
    meta: {
      costCoveragePct: Math.round(costCoverage * 100),
      distinctDays,
      dateFormatAmbiguous: rowResult.dateInfo?.ambiguous ?? false,
      dayFirst: rowResult.dateInfo?.dayFirst ?? true,
      duplicateCount: rowResult.duplicateCount,
    },
  };
}
