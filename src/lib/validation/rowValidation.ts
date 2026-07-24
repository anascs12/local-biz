/**
 * Row-level validation — SPEC §12.3 / §10.4.
 *
 * Coerces each raw row against the confirmed column mapping, rejects invalid
 * rows (keeping the dataset), and collects grouped issues with example row
 * numbers. Warnings (negative revenue, invalid cost, duplicates) keep the row.
 */

import type { Transaction } from "@/types/transaction";
import type { ValidationIssue, ValidationIssueCode } from "@/types/validation";
import type { ColumnMapping, RawRow } from "@/lib/parsing/columnMapper";
import { detectDateFormat, parseDate, type DateFormatInfo } from "@/lib/parsing/dateParser";
import { parseNumber } from "@/lib/parsing/numberParser";
import {
  buildTransaction,
  cleanString,
  normalizeCategory,
  normalizeProduct,
} from "@/lib/parsing/normalize";
import { ISSUE_META } from "./messages";

const MIN_DATE = new Date(1970, 0, 1).getTime();
const MAX_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
})();

const EXAMPLE_LIMIT = 10; // §9.2 — up to 10 example row numbers per issue

export interface RowValidationOptions {
  /** Remove exact duplicates (default off — repeat sales are common, §10.4). */
  removeDuplicates?: boolean;
  /**
   * Override day/month order for the numeric date family (§11.2).
   * Set when the user picks "Switch to month/day/year" on the mapping screen.
   */
  dayFirst?: boolean;
}

export interface RowValidationResult {
  transactions: Transaction[];
  issues: ValidationIssue[];
  validRowCount: number;
  skippedRowCount: number;
  duplicateCount: number;
  dateInfo: DateFormatInfo | null;
}

class IssueAccumulator {
  private map = new Map<ValidationIssueCode, { count: number; rows: number[] }>();

  add(code: ValidationIssueCode, sourceRow: number) {
    let e = this.map.get(code);
    if (!e) {
      e = { count: 0, rows: [] };
      this.map.set(code, e);
    }
    e.count++;
    if (e.rows.length < EXAMPLE_LIMIT) e.rows.push(sourceRow);
  }

  build(extra?: Partial<Record<ValidationIssueCode, number>>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const [code, { count, rows }] of this.map) {
      const meta = ISSUE_META[code];
      issues.push({
        code,
        severity: meta.severity,
        message: meta.message(count, extra?.[code]),
        count,
        exampleRows: rows,
      });
    }
    return issues;
  }
}

export function validateRows(
  rawRows: RawRow[],
  mapping: ColumnMapping,
  options: RowValidationOptions = {},
): RowValidationResult {
  // Detect date format from the mapped date column (§11.2).
  const dateColumn = mapping.date;
  const dateSamples = dateColumn
    ? rawRows.map((r) => r[dateColumn]).filter((v) => v != null && String(v).trim() !== "").map(String)
    : [];
  let dateInfo = dateColumn ? detectDateFormat(dateSamples) : null;
  // User override of day/month order (§11.2). Only meaningful for the numeric
  // family — ISO and month-name formats are unambiguous.
  if (dateInfo && dateInfo.format === "numeric" && options.dayFirst !== undefined) {
    dateInfo = { ...dateInfo, dayFirst: options.dayFirst };
  }

  const acc = new IssueAccumulator();
  const kept: { txn: Transaction; sourceRow: number }[] = [];
  let validIndex = 0;

  const get = (row: RawRow, field: keyof ColumnMapping): unknown => {
    const header = mapping[field];
    return header ? row[header] : undefined;
  };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const sourceRow = i + 2; // header is row 1

    // 1. Date — reject if unreadable, then range-check (§12.3).
    const date = dateInfo ? parseDate(get(row, "date"), dateInfo) : null;
    if (date === null) {
      acc.add("unreadable_date", sourceRow);
      continue;
    }
    const t = date.getTime();
    if (t < MIN_DATE || t > MAX_DATE) {
      acc.add("date_out_of_range", sourceRow);
      continue;
    }

    // 2. Product — reject if empty after trim.
    const product = normalizeProduct(get(row, "product"));
    if (product === "") {
      acc.add("empty_product", sourceRow);
      continue;
    }

    // 3. Quantity — reject if not numeric and > 0.
    const quantity = parseNumber(get(row, "quantity"));
    if (quantity === null || quantity <= 0) {
      acc.add("invalid_quantity", sourceRow);
      continue;
    }

    // 4. Revenue — reject if not finite. Negative kept (flagged); zero kept.
    const revenue = parseNumber(get(row, "revenue"));
    if (revenue === null) {
      acc.add("invalid_revenue", sourceRow);
      continue;
    }
    if (revenue < 0) acc.add("negative_revenue", sourceRow); // warning, keep

    // 5. Category.
    const category = mapping.category ? normalizeCategory(get(row, "category")) : "Uncategorized";

    // 6. Cost — invalid-when-present is a warning (kept, excluded from profit).
    let cost: number | null = null;
    if (mapping.cost) {
      const rawCost = get(row, "cost");
      if (rawCost != null && String(rawCost).trim() !== "") {
        const cn = parseNumber(rawCost);
        if (cn === null) acc.add("invalid_cost", sourceRow);
        else cost = cn;
      }
    }

    // 7. Optional fields.
    const orderRaw = mapping.order_id ? cleanString(get(row, "order_id")) : "";
    const order_id = orderRaw === "" ? null : orderRaw;
    const customerRaw = mapping.customer ? cleanString(get(row, "customer")) : "";
    const customer = customerRaw === "" ? null : customerRaw;
    const discount = mapping.discount ? parseNumber(get(row, "discount")) : null;

    kept.push({
      txn: buildTransaction({
        index: validIndex++,
        date,
        product,
        category,
        quantity,
        revenue,
        cost,
        customer,
        discount,
        order_id,
      }),
      sourceRow,
    });
  }

  // Duplicate detection — exact match on (date, product, quantity, revenue) (§10.4).
  const seen = new Set<string>();
  let duplicateCount = 0;
  const finalTxns: Transaction[] = [];
  for (const { txn, sourceRow } of kept) {
    const key = `${txn.date.getTime()}|${txn.product}|${txn.quantity}|${txn.revenue}`;
    if (seen.has(key)) {
      duplicateCount++;
      acc.add("duplicate_row", sourceRow);
      if (options.removeDuplicates) continue; // default: keep
    } else {
      seen.add(key);
    }
    finalTxns.push(txn);
  }

  return {
    transactions: finalTxns,
    issues: acc.build(),
    validRowCount: finalTxns.length,
    skippedRowCount: rawRows.length - kept.length,
    duplicateCount,
    dateInfo,
  };
}
