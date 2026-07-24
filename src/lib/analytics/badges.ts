/**
 * Classification names and rules — SPEC §13.6.
 *
 * These live in the analytics layer, not in a UI folder, because they are part
 * of the classification definition itself: the product table, the chips, the
 * rules disclosure and the AI context all name the same six classifications.
 * The UI adds presentation (icon, colour) on top of these.
 */

import type { ProductBadge } from "@/types/analytics";

export const BADGE_LABEL: Record<ProductBadge, string> = {
  best_seller: "Best Seller",
  most_profitable: "Most Profitable",
  growing: "Growing",
  declining: "Declining",
  low_volume: "Low Volume",
  needs_attention: "Needs Attention",
};

/** The exact rule, shown to the user (§13.6 — rules are not hidden). */
export const BADGE_RULE: Record<ProductBadge, string> = {
  best_seller: "Units sold in the top 10% of all products.",
  most_profitable: "Total profit in the top 10% of all products. Requires cost data.",
  growing: "Modelled revenue trend of at least +15% across the period.",
  declining: "Modelled revenue trend of −15% or worse across the period.",
  low_volume: "Units sold in the bottom 25% of all products.",
  needs_attention:
    "Revenue in the top 25% but profit margin more than 5 points below the business average.",
};
