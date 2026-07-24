"use client";

/**
 * Classification chips + rules disclosure — SPEC §9.5 / §13.6.
 *
 * "An info popover on the chips header links to the exact classification rules
 * (§13.6) — rules are shown to the user, not hidden."
 *
 * The 💰 Most Profitable and 🔎 Needs Attention chips are HIDDEN entirely when
 * there is no cost data (§12.5.3), rather than shown with a zero count.
 */

import type { ProductBadge, ProductMetrics } from "@/types/analytics";
import { BADGE_META } from "./ProductBadges";
import { cn } from "@/lib/utils/cn";

export const CHIP_ORDER: ProductBadge[] = [
  "best_seller",
  "growing",
  "declining",
  "most_profitable",
  "low_volume",
  "needs_attention",
];

/** Badges that cannot be computed without cost data (§12.5.3). */
const COST_DEPENDENT: ProductBadge[] = ["most_profitable", "needs_attention"];

export function visibleBadges(hasCostData: boolean): ProductBadge[] {
  return hasCostData ? CHIP_ORDER : CHIP_ORDER.filter((b) => !COST_DEPENDENT.includes(b));
}

export function countByBadge(
  products: ProductMetrics[],
  badge: ProductBadge,
): number {
  return products.filter((p) => p.badges.includes(badge)).length;
}

export function ClassificationChips({
  products,
  hasCostData,
  active,
  onChange,
}: {
  products: ProductMetrics[];
  hasCostData: boolean;
  active: ProductBadge | "all";
  onChange: (next: ProductBadge | "all") => void;
}) {
  const badges = visibleBadges(hasCostData);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Filter by classification" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("all")}
          aria-pressed={active === "all"}
          className={cn(
            "rounded-full border px-3 py-1.5 text-small font-medium transition-colors",
            active === "all"
              ? "border-primary-600 bg-primary-600 text-white"
              : "border-border bg-bg-card text-text-600 hover:bg-primary-50",
          )}
        >
          All <span className="nums opacity-70">{products.length}</span>
        </button>

        {badges.map((b) => {
          const meta = BADGE_META[b];
          const count = countByBadge(products, b);
          const isActive = active === b;
          return (
            <button
              key={b}
              type="button"
              onClick={() => onChange(isActive ? "all" : b)}
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-3 py-1.5 text-small font-medium transition-colors",
                isActive
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-border bg-bg-card text-text-600 hover:bg-primary-50",
              )}
            >
              <span aria-hidden="true">{meta.icon}</span> {meta.label}{" "}
              <span className="nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* The rules themselves — transparent by design (§13.6) */}
      <details className="rounded-lg border border-border bg-bg-card">
        <summary className="cursor-pointer px-4 py-2.5 text-small font-medium text-text-600 hover:text-text-900">
          How are these classifications decided?
        </summary>
        <dl className="border-t border-border px-4 py-3">
          {badges.map((b) => {
            const meta = BADGE_META[b];
            return (
              <div key={b} className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-3">
                <dt className="w-48 shrink-0 text-small font-medium text-text-900">
                  <span aria-hidden="true">{meta.icon}</span> {meta.label}
                </dt>
                <dd className="text-small text-text-600">{meta.rule}</dd>
              </div>
            );
          })}
          <p className="pt-2 text-caption text-text-400">
            A product can hold several badges at once — that overlap is often the insight.
          </p>
        </dl>
      </details>
    </div>
  );
}
