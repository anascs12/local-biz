/**
 * Plain-language message catalogue — SPEC §12 / §24.
 *
 * No raw stack trace, error code, or provider error body is ever shown to a
 * user (§24). Every message tells them what happened and what to do next.
 */

import type { ValidationIssueCode, ValidationSeverity } from "@/types/validation";

// ── File-level (block on failure) — §12.1 / §24 ─────────────────────────────
export const FILE_ERRORS = {
  unsupportedType: () =>
    "That file type isn't supported. Please upload a CSV or Excel file (.csv, .xlsx, .xls).",
  tooLarge: (mb: number) =>
    `This file is ${mb.toFixed(1)} MB, and the maximum is 10 MB. Try exporting a shorter date range.`,
  tooManyRows: (rows: number) =>
    `This file has ${rows.toLocaleString("en-US")} rows and the maximum is 100,000. Try splitting it by month.`,
  parseFailure: () =>
    "We couldn't read this file. It may be corrupted, password-protected, or in an unusual format.",
  empty: () => "This file appears to be empty.",
} as const;

// ── Dataset-level (block on failure) — §12.2 ────────────────────────────────
export const DATASET_ERRORS = {
  missingRequired: (label: string) =>
    `We couldn't find a column for **${label}**. Please choose which of your columns holds the ${label.toLowerCase()}.`,
  noValidRows: () =>
    "None of the rows in this file could be read. Check that dates and amounts are in a standard format.",
} as const;

/**
 * AI error messages — §24.
 * No provider error body, status code, or stack trace is ever shown (§15.3):
 * every failure maps to one of these sentences.
 */
export const AI_ERRORS = {
  unavailable:
    "The AI analyst is temporarily unavailable. Your dashboard and analytics are unaffected.",
  rateLimited: "You've reached the AI request limit for this hour. Please try again later.",
  badRequest:
    "We couldn't send this request to the AI analyst. Try reloading the page and asking again.",
  tooLarge:
    "There is too much data in this request for the AI analyst. Try narrowing the date range or selecting fewer categories.",
  notConfigured:
    "The AI analyst isn't configured on this deployment. Your dashboard and analytics are unaffected.",
  offline: "You appear to be offline. Analytics still work; the AI features need a connection.",
} as const;

// ── Row-level & warning messages — §12.3 / §12.4 ────────────────────────────
export const ISSUE_META: Record<
  ValidationIssueCode,
  { severity: ValidationSeverity; skip: boolean; message: (n: number, extra?: number) => string }
> = {
  unreadable_date: {
    severity: "error",
    skip: true,
    message: (n) => `${n} rows had a date we couldn't read`,
  },
  empty_product: {
    severity: "error",
    skip: true,
    message: (n) => `${n} rows had no product name`,
  },
  invalid_quantity: {
    severity: "error",
    skip: true,
    message: (n) => `${n} rows had a missing or invalid quantity`,
  },
  invalid_revenue: {
    severity: "error",
    skip: true,
    message: (n) => `${n} rows had a missing or invalid sale amount`,
  },
  date_out_of_range: {
    severity: "error",
    skip: true,
    message: (n) => `${n} rows had a date outside a reasonable range`,
  },
  invalid_cost: {
    severity: "warning",
    skip: false,
    message: (n) => `${n} rows had an invalid cost — those rows are included, but excluded from profit`,
  },
  negative_revenue: {
    severity: "warning",
    skip: false,
    message: (n) => `${n} rows had negative revenue and were flagged as likely returns`,
  },
  duplicate_row: {
    severity: "warning",
    skip: false,
    message: (n) => `${n} rows are exact duplicates of another row (often normal for repeat sales)`,
  },
  low_cost_coverage: {
    severity: "warning",
    skip: false,
    message: (_n, pct) => `Profit is based on the ${pct ?? 0}% of your rows that include a cost`,
  },
  few_distinct_days: {
    severity: "warning",
    skip: false,
    message: () =>
      "Trend analysis needs at least two weeks of data to be meaningful. Growth figures on this dataset are indicative only.",
  },
  mostly_uncategorized: {
    severity: "warning",
    skip: false,
    message: () => "Most rows have no category, so category analysis is limited.",
  },
};
