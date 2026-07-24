/**
 * Normalized internal transaction record — SPEC §10.2.
 *
 * Every downstream metric derives from an array of these. Derived fields
 * (§10.3): profit = revenue − cost (only when cost !== null);
 * profit_margin = (profit / revenue) × 100 (only when revenue > 0).
 */
export interface Transaction {
  /** Generated: `txn_${index}` if no order id. */
  transaction_id: string;
  /** Parsed, normalized to local midnight. */
  date: Date;
  /** Trimmed, whitespace-collapsed. */
  product: string;
  /** "Uncategorized" if absent. */
  category: string;
  /** > 0. */
  quantity: number;
  /** >= 0. */
  revenue: number;
  /** null when unavailable. */
  cost: number | null;
  /** null when cost is null. */
  profit: number | null;
  /** null when cost is null or revenue === 0. */
  profit_margin: number | null;
  customer: string | null;
  discount: number | null;
  order_id: string | null;
}
