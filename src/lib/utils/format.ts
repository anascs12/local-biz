/**
 * Display formatting — SPEC §3 / §20.1 / §20.3.
 *
 * Currency is PKR formatted as "Rs. 1,234,567" using `en-PK` grouping (verified:
 * en-PK yields Western grouping, matching the SPEC's example — not the Indian
 * lakh/crore grouping en-IN uses). Dates default to DD/MM (Pakistani convention).
 *
 * These functions only FORMAT numbers the analytics layer already computed. They
 * never derive a figure.
 */

const LOCALE = "en-PK";

const groupFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** "Rs. 1,234,567" */
export function formatPKR(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  return `${sign}Rs. ${groupFormatter.format(Math.abs(Math.round(n)))}`;
}

/** Compact currency for chart axes: "Rs. 1.2M", "Rs. 450k". */
export function formatPKRCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}Rs. ${decimalFormatter.format(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}Rs. ${decimalFormatter.format(abs / 1_000)}k`;
  return `${sign}Rs. ${groupFormatter.format(abs)}`;
}

/** "1,234" */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return groupFormatter.format(n);
}

/** "27.4%" — returns an em dash for null so the UI never prints "null%". */
export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** "+18.2%" / "−4.1%" — signed, for delta pills. */
export function formatDelta(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

/** DD/MM/YYYY (§11.2 Pakistani convention). */
export function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "4 Aug 2025" */
export function formatDateLong(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Human label for a time-series bucket key.
 * monthly "2025-08" → "Aug 2025" · daily/weekly "2025-08-04" → "4 Aug".
 */
export function formatPeriod(period: string, granularity: "daily" | "weekly" | "monthly"): string {
  if (granularity === "monthly") {
    const [y, m] = period.split("-").map(Number);
    return `${MONTH_SHORT[(m ?? 1) - 1]} ${y}`;
  }
  const [, m, d] = period.split("-").map(Number);
  return `${d} ${MONTH_SHORT[(m ?? 1) - 1]}`;
}

/** Inclusive range label for the filter/report scope, e.g. "1 Aug 2025 – 31 Jan 2026". */
export function formatRange(start: Date, end: Date): string {
  return `${formatDateLong(start)} – ${formatDateLong(end)}`;
}
