/**
 * Number parsing — SPEC §11.3.
 *
 * Strip currency symbols (Rs., PKR, ₨, $), thousands separators (,) and
 * whitespace. Handle parenthesized negatives `(1200)` → −1200. Reject anything
 * remaining that is not finite.
 */

const CURRENCY_RE = /rs\.?|pkr|₨|rs\b|\$/gi;

export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (s === "") return null;

  // Parenthesized negative: (1200) → -1200
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  // Strip currency symbols, thousands separators, and whitespace.
  s = s.replace(CURRENCY_RE, "").replace(/,/g, "").replace(/\s+/g, "").trim();

  // A leading sign after stripping.
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  if (s === "" || !/^\d*\.?\d+$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}
