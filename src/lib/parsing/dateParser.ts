/**
 * Date parsing — SPEC §11.2.
 *
 * Try formats in this order and take the first that yields a valid date for
 * ≥90% of sampled rows:
 *   YYYY-MM-DD → DD/MM/YYYY → MM/DD/YYYY → DD-MM-YYYY → DD-MMM-YYYY
 *   → Excel serial → native Date parse.
 *
 * DD/MM vs MM/DD ambiguity: scan the column. If any value's first component > 12
 * it is DD/MM; if any second component > 12 it is MM/DD; if neither is decisive,
 * default to DD/MM/YYYY (Pakistani convention) and flag `ambiguous` so the UI can
 * show a correctable notice. Silent misparsing of dates is the highest-severity
 * failure mode in this product (§11.2) — it must be visible and correctable.
 *
 * All returned dates are normalized to LOCAL midnight (§10.2).
 */

export type DateFormat = "iso" | "numeric" | "monthName" | "excel" | "native";

export interface DateFormatInfo {
  format: DateFormat;
  /** For the numeric family: true ⇒ day-first (DD/MM), false ⇒ month-first (MM/DD). */
  dayFirst: boolean;
  /** True when day/month order could not be decided and day-first was assumed. */
  ambiguous: boolean;
  /** Fraction of sampled values the chosen format parsed (0..1). */
  confidence: number;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/;
const NUMERIC_RE = /^(\d{1,2})([/-])(\d{1,2})\2(\d{2,4})$/;
const MONTHNAME_RE = /^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})$/;

function makeLocalMidnight(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  // Round-trip guard rejects overflow like 30 Feb.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

function normalizeYear(y: number): number {
  if (y >= 100) return y;
  return y < 70 ? 2000 + y : 1900 + y;
}

/** Excel serial (1900 date system, with the 1900 leap-year offset baked in). */
export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000); // 25569 = 1899-12-30 → 1970-01-01
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function parseWith(value: string, info: DateFormatInfo): Date | null {
  const s = value.trim();
  if (s === "") return null;

  switch (info.format) {
    case "iso": {
      const m = ISO_RE.exec(s);
      if (!m) return null;
      return makeLocalMidnight(+m[1], +m[2], +m[3]);
    }
    case "numeric": {
      const m = NUMERIC_RE.exec(s);
      if (!m) return null;
      const a = +m[1];
      const b = +m[3];
      const y = normalizeYear(+m[4]);
      const day = info.dayFirst ? a : b;
      const month = info.dayFirst ? b : a;
      return makeLocalMidnight(y, month, day);
    }
    case "monthName": {
      const m = MONTHNAME_RE.exec(s);
      if (!m) return null;
      const day = +m[1];
      const month = MONTHS[m[2].toLowerCase()];
      const y = normalizeYear(+m[3]);
      if (!month) return null;
      return makeLocalMidnight(y, month, day);
    }
    case "excel": {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      return excelSerialToDate(n);
    }
    case "native": {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
}

function successRate(values: string[], info: DateFormatInfo): number {
  if (values.length === 0) return 0;
  let ok = 0;
  for (const v of values) if (parseWith(v, info) !== null) ok++;
  return ok / values.length;
}

/** Decide day-first vs month-first for the numeric family by scanning the column. */
function disambiguateNumeric(values: string[]): { dayFirst: boolean; ambiguous: boolean } {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const v of values) {
    const m = NUMERIC_RE.exec(v.trim());
    if (!m) continue;
    if (+m[1] > 12) firstOver12 = true;
    if (+m[3] > 12) secondOver12 = true;
  }
  if (firstOver12 && !secondOver12) return { dayFirst: true, ambiguous: false };
  if (secondOver12 && !firstOver12) return { dayFirst: false, ambiguous: false };
  // Neither decisive (or conflicting) → default to DD/MM (Pakistani convention).
  return { dayFirst: true, ambiguous: true };
}

const THRESHOLD = 0.9;

/**
 * Detect the date format for a column from a sample of its values.
 * Returns null if no candidate parses ≥90% of the sample.
 */
export function detectDateFormat(values: string[]): DateFormatInfo | null {
  const samples = values.map((v) => (v == null ? "" : String(v))).filter((v) => v.trim() !== "").slice(0, 200);
  if (samples.length === 0) return null;

  // 1. ISO
  const iso: DateFormatInfo = { format: "iso", dayFirst: true, ambiguous: false, confidence: 0 };
  iso.confidence = successRate(samples, iso);
  if (iso.confidence >= THRESHOLD) return iso;

  // 2–4. Numeric family (DD/MM, MM/DD, DD-MM), disambiguated by scan.
  const { dayFirst, ambiguous } = disambiguateNumeric(samples);
  const numeric: DateFormatInfo = { format: "numeric", dayFirst, ambiguous, confidence: 0 };
  numeric.confidence = successRate(samples, numeric);
  if (numeric.confidence >= THRESHOLD) return numeric;

  // 5. DD-MMM-YYYY
  const monthName: DateFormatInfo = { format: "monthName", dayFirst: true, ambiguous: false, confidence: 0 };
  monthName.confidence = successRate(samples, monthName);
  if (monthName.confidence >= THRESHOLD) return monthName;

  // 6. Excel serial
  const excel: DateFormatInfo = { format: "excel", dayFirst: true, ambiguous: false, confidence: 0 };
  excel.confidence = successRate(samples, excel);
  if (excel.confidence >= THRESHOLD) return excel;

  // 7. Native
  const native: DateFormatInfo = { format: "native", dayFirst: true, ambiguous: false, confidence: 0 };
  native.confidence = successRate(samples, native);
  if (native.confidence >= THRESHOLD) return native;

  // Return the best effort (highest confidence) so the caller can still show a notice.
  const best = [iso, numeric, monthName, excel, native].sort((a, b) => b.confidence - a.confidence)[0];
  return best.confidence > 0 ? best : null;
}

/** Parse a single value with a previously detected format. */
export function parseDate(value: unknown, info: DateFormatInfo): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (value == null) return null;
  return parseWith(String(value), info);
}
