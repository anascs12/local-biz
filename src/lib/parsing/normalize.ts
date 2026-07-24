/**
 * Field normalization helpers — SPEC §10.2 / §10.4.
 *
 * These are the pure coercion functions used by row validation to turn a raw
 * cell into a normalized field value. Derived fields (profit, margin) follow
 * §10.3 exactly and are the ONLY place those values are produced during
 * ingestion.
 */

import type { Transaction } from "@/types/transaction";

/** Trim and collapse internal whitespace. */
export function cleanString(v: unknown): string {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Product name normalization (§10.4): trim, collapse internal whitespace,
 * title-case for grouping so "blue shirt" and "Blue Shirt " become one product.
 *
 * Hyphenated segments are capitalized individually so "T-Shirt" survives as
 * "T-Shirt" rather than "T-shirt". Apostrophes are deliberately NOT split on,
 * which would produce "Men'S".
 */
function capitalizeSegment(word: string): string {
  return word
    .split("-")
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase()))
    .join("-");
}

export function normalizeProduct(v: unknown): string {
  const s = cleanString(v);
  if (s === "") return "";
  return s.split(" ").map(capitalizeSegment).join(" ");
}

/** Category normalization (§10.4): trim/collapse; "Uncategorized" when absent. */
export function normalizeCategory(v: unknown): string {
  const s = cleanString(v);
  return s === "" ? "Uncategorized" : s;
}

/** Derived profit/margin — §10.3. Never produced without a real cost input (§12.5). */
export function deriveProfit(revenue: number, cost: number | null): {
  profit: number | null;
  profit_margin: number | null;
} {
  if (cost === null) return { profit: null, profit_margin: null };
  const profit = revenue - cost;
  const profit_margin = revenue > 0 ? (profit / revenue) * 100 : null;
  return { profit, profit_margin };
}

/** Assemble a normalized Transaction from already-coerced parts. */
export function buildTransaction(parts: {
  index: number;
  date: Date;
  product: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number | null;
  customer: string | null;
  discount: number | null;
  order_id: string | null;
}): Transaction {
  const { profit, profit_margin } = deriveProfit(parts.revenue, parts.cost);
  return {
    transaction_id: parts.order_id ?? `txn_${parts.index}`,
    date: parts.date,
    product: parts.product,
    category: parts.category,
    quantity: parts.quantity,
    revenue: parts.revenue,
    cost: parts.cost,
    profit,
    profit_margin,
    customer: parts.customer,
    discount: parts.discount,
    order_id: parts.order_id,
  };
}
