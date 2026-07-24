/**
 * Product classification badges — SPEC §13.6 / §20.5 / §20.7.
 * One color per classification, and every badge pairs an icon with a WORD so it
 * never depends on color alone (§20.7).
 */

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { ProductBadge } from "@/types/analytics";
import { BADGE_LABEL, BADGE_RULE } from "@/lib/analytics/badges";

/** Presentation only — the label and rule come from the analytics layer. */
const BADGE_STYLE: Record<ProductBadge, { icon: string; tone: BadgeTone }> = {
  best_seller: { icon: "🔥", tone: "warning" },
  most_profitable: { icon: "💰", tone: "success" },
  growing: { icon: "📈", tone: "primary" },
  declining: { icon: "⚠️", tone: "error" },
  low_volume: { icon: "📦", tone: "neutral" },
  needs_attention: { icon: "🔎", tone: "violet" },
};

export const BADGE_META: Record<
  ProductBadge,
  { icon: string; label: string; tone: BadgeTone; rule: string }
> = Object.fromEntries(
  (Object.keys(BADGE_STYLE) as ProductBadge[]).map((b) => [
    b,
    { ...BADGE_STYLE[b], label: BADGE_LABEL[b], rule: BADGE_RULE[b] },
  ]),
) as Record<ProductBadge, { icon: string; label: string; tone: BadgeTone; rule: string }>;

export function ProductBadgeList({ badges }: { badges: ProductBadge[] }) {
  if (badges.length === 0) return <span className="text-text-400">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => {
        const meta = BADGE_META[b];
        return (
          <Badge key={b} tone={meta.tone} title={meta.rule}>
            <span aria-hidden="true">{meta.icon}</span>
            {meta.label}
          </Badge>
        );
      })}
    </span>
  );
}
