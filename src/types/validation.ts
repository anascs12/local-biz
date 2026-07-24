/**
 * Validation types.
 *
 * NOTE: `Dataset` (§10.2) references `ValidationIssue[]`, but the SPEC never
 * gives the `ValidationIssue` shape explicitly. The shape below is derived
 * faithfully from the validation rules in §12.3 (row-level grouped checks) and
 * the Stage-3 validation report UI in §9.2 ("a grouped list of issues … each
 * expandable to show up to 10 example row numbers"). Codes map 1:1 to the
 * checks in §12.3–§12.4.
 */

export type ValidationSeverity =
  | "error" // row is rejected/skipped (§12.3)
  | "warning"; // row is kept but flagged (§12.3 cost / §12.4 warnings)

export type ValidationIssueCode =
  | "unreadable_date" // §12.3 — "N rows had a date we couldn't read"
  | "empty_product" // §12.3 — "N rows had no product name"
  | "invalid_quantity" // §12.3 — "N rows had a missing or invalid quantity"
  | "invalid_revenue" // §12.3 — "N rows had a missing or invalid sale amount"
  | "invalid_cost" // §12.3 — invalid cost (kept, excluded from profit) — warning
  | "date_out_of_range" // §12.3 — date outside 1970..(today + 1 year)
  | "negative_revenue" // §10.4 — likely return (kept, flagged) — warning
  | "duplicate_row" // §10.4 / §12.4 — exact duplicate (kept, flagged) — warning
  | "low_cost_coverage" // §12.4 — profit based on N% of rows that include cost
  | "few_distinct_days" // §12.4 — <14 distinct days; trends indicative only
  | "mostly_uncategorized"; // §12.4 — >50% Uncategorized; category analysis limited

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  /** Plain-language, grouped message (§12.3), e.g. "12 rows had a date we couldn't read". */
  message: string;
  /** Number of rows affected by this issue. */
  count: number;
  /** Up to 10 example source row numbers (1-indexed, including the header row offset). */
  exampleRows: number[];
}
