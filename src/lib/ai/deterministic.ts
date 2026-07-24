/**
 * Deterministic analysis — no LLM, no API key, no cost.
 *
 * WHY THIS EXISTS: the AI features need a paid API key. A public demo without
 * one would show an error where the headline feature should be. §19 already
 * establishes the pattern — "fall back to deterministic insight cards computed
 * in TypeScript from patterns and anomalies" — so this extends a SPEC-endorsed
 * idea from insight cards to the full report and to the suggested questions.
 *
 * HONESTY RULES for everything in this file:
 *   1. Every sentence is derived from a computed figure. Nothing is invented.
 *   2. Output is NEVER presented as AI-generated. The UI labels it as computed.
 *   3. The §12.5 rule still holds absolutely — with no cost data, this produces
 *      no profit figure and says so, exactly as the AI is instructed to.
 *
 * This is deliberately not an imitation of the model. It states what the data
 * shows and stops; it does not speculate about causes.
 */

import type { Dataset } from "@/types/dataset";
import type { AnalyticsResult, ProductMetrics } from "@/types/analytics";
import type { Filters } from "@/context/FilterContext";
import {
  formatNumber,
  formatPKR,
  formatPct,
  formatPeriod,
  formatRange,
} from "@/lib/utils/format";

const NO_COST_STATEMENT =
  "Profit analysis is unavailable because this file does not include a cost column with enough coverage. " +
  "To unlock profit and margin, add a column recording what each sale cost you, then upload again. " +
  "These figures are never estimated.";

function scopeOf(analytics: AnalyticsResult, filters: Filters): string {
  const categories =
    filters.categories === "all"
      ? "all categories"
      : `${filters.categories.length} selected categor${filters.categories.length === 1 ? "y" : "ies"}`;
  return `${formatRange(analytics.window.start, analytics.window.end)} · ${categories}`;
}

function movement(pct: number | null): string {
  if (pct === null) return "held broadly steady";
  if (pct >= 15) return `grew ${formatPct(pct)}`;
  if (pct <= -15) return `fell ${formatPct(Math.abs(pct))}`;
  return "held broadly steady";
}

/** Top-N by revenue, excluding negative-revenue rows from rankings (§10.4). */
function byRevenue(products: ProductMetrics[]): ProductMetrics[] {
  return [...products].filter((p) => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
}

// ─────────────────────────────────────────────────────────────────────────────
// Eight-section report — same headings and order as §18
// ─────────────────────────────────────────────────────────────────────────────
export function deterministicReport(
  dataset: Dataset,
  analytics: AnalyticsResult,
  filters: Filters,
): string {
  const { kpis, meta, patterns, categories, products } = analytics;
  const hasCost = meta.hasCostData;
  const ranked = byRevenue(products);
  const top = ranked[0];
  const worst = ranked[ranked.length - 1];
  const cats = [...categories].sort((a, b) => b.revenue - a.revenue);
  const bestCat = cats[0];
  const weakestCat = cats[cats.length - 1];
  const growing = products.filter((p) => p.trendLabel === "growing");
  const declining = products.filter((p) => p.trendLabel === "declining");
  const attention = products.filter((p) => p.badges.includes("needs_attention"));
  const lossMakers = products.filter((p) => p.profit !== null && p.profit < 0);
  const out: string[] = [];

  // ── 1
  out.push("## Executive Summary");
  out.push(
    `Over ${scopeOf(analytics, filters)}, ${dataset.name} recorded ${formatPKR(kpis.totalRevenue)} in revenue ` +
      `from ${formatNumber(kpis.totalOrders)} orders and ${formatNumber(kpis.unitsSold)} units, ` +
      `an average of ${formatPKR(kpis.averageOrderValue)} per order.` +
      (hasCost
        ? ` Profit was ${formatPKR(kpis.totalProfit)}, a margin of ${formatPct(kpis.profitMarginPct)}.`
        : " Profit could not be calculated because the file has no cost column.") +
      (kpis.growthRatePct !== null
        ? ` Comparing the second half of the period with the first, revenue ${movement(kpis.growthRatePct)}.`
        : ""),
  );
  if (top) {
    const share = (top.revenue / kpis.totalRevenue) * 100;
    out.push(
      `${top.name} is the largest single contributor at ${formatPKR(top.revenue)} (${formatPct(share)} of revenue).`,
    );
  }

  // ── 2
  out.push("\n## Sales Performance");
  out.push(
    `Revenue totalled ${formatPKR(kpis.totalRevenue)} across ${formatNumber(kpis.totalOrders)} orders ` +
      `and ${formatNumber(kpis.unitsSold)} units, bucketed ${analytics.timeSeries.granularity} over ` +
      `${formatNumber(meta.distinctDays)} days with recorded sales.`,
  );
  if (patterns.bestPeriod && patterns.worstPeriod) {
    out.push(
      `The strongest period was ${formatPeriod(patterns.bestPeriod.period, analytics.timeSeries.granularity)} ` +
        `at ${formatPKR(patterns.bestPeriod.revenue)}; the weakest was ` +
        `${formatPeriod(patterns.worstPeriod.period, analytics.timeSeries.granularity)} at ${formatPKR(patterns.worstPeriod.revenue)}.`,
    );
  }
  if (patterns.weekendUpliftPct !== null && patterns.bestDayOfWeek) {
    out.push(
      `By day of week, ${patterns.bestDayOfWeek} performs best on average, and weekend days take ` +
        `${formatPct(patterns.weekendUpliftPct)} ${patterns.weekendUpliftPct >= 0 ? "more" : "less"} per day than weekdays.`,
    );
  }
  if (meta.trendReliability !== "good") {
    out.push(
      `*Observation quality:* this range has limited history, so movement figures are indicative only.`,
    );
  }

  // ── 3
  out.push("\n## Profitability");
  if (!hasCost) {
    out.push(NO_COST_STATEMENT);
  } else {
    out.push(
      `Profit was ${formatPKR(kpis.totalProfit)} on ${formatPKR(kpis.totalRevenue)} of revenue, ` +
        `a margin of ${formatPct(kpis.profitMarginPct)}` +
        (kpis.costedTransactionCount < kpis.transactionCount
          ? `, based on the ${formatNumber(kpis.costedTransactionCount)} of ${formatNumber(kpis.transactionCount)} transactions that include cost data.`
          : "."),
    );
    if (attention.length > 0) {
      const a = attention[0];
      out.push(
        `${a.name} sits in the top quarter by revenue but earns a ${formatPct(a.marginPct)} margin, ` +
          `against a business average of ${formatPct(meta.businessMarginPct)} — the gap between a large ` +
          `revenue line and a below-average margin is where most recoverable profit sits.`,
      );
    }
    if (lossMakers.length > 0) {
      out.push(
        `${lossMakers.length} product${lossMakers.length === 1 ? "" : "s"} sold at a loss: ` +
          lossMakers
            .slice(0, 3)
            .map((p) => `${p.name} (${formatPKR(p.profit)}, ${formatPct(p.marginPct)})`)
            .join(", ") +
          ".",
      );
    }
  }

  // ── 4
  out.push("\n## Product Performance");
  if (top) {
    out.push(
      `Best performers by revenue: ` +
        ranked
          .slice(0, 3)
          .map(
            (p) =>
              `**${p.name}** ${formatPKR(p.revenue)} (${formatNumber(p.unitsSold)} units${
                hasCost && p.marginPct !== null ? `, ${formatPct(p.marginPct)} margin` : ""
              })`,
          )
          .join("; ") +
        ".",
    );
  }
  if (worst && worst !== top) {
    out.push(
      `Weakest by revenue: **${worst.name}** at ${formatPKR(worst.revenue)} from ` +
        `${formatNumber(worst.unitsSold)} units.`,
    );
  }
  if (growing.length > 0) {
    out.push(
      `Growing: ` +
        growing.slice(0, 3).map((p) => `${p.name} (${formatPct(p.trendPct)})`).join(", ") +
        ".",
    );
  }
  if (declining.length > 0) {
    out.push(
      `Declining: ` +
        declining.slice(0, 3).map((p) => `${p.name} (${formatPct(p.trendPct)})`).join(", ") +
        ".",
    );
  }

  // ── 5
  out.push("\n## Category Performance");
  if (bestCat) {
    out.push(
      `**${bestCat.name}** is the largest category at ${formatPKR(bestCat.revenue)}, ` +
        `${formatPct(bestCat.contributionPct)} of revenue` +
        (hasCost && bestCat.marginPct !== null ? `, at a ${formatPct(bestCat.marginPct)} margin.` : "."),
    );
  }
  if (weakestCat && weakestCat !== bestCat) {
    out.push(
      `**${weakestCat.name}** contributes least at ${formatPct(weakestCat.contributionPct)} ` +
        `(${formatPKR(weakestCat.revenue)}).`,
    );
  }
  const catGrow = cats.filter((c) => c.trendLabel === "growing");
  const catDecl = cats.filter((c) => c.trendLabel === "declining");
  if (catGrow.length) {
    out.push(`Growing categories: ${catGrow.map((c) => `${c.name} (${formatPct(c.trendPct)})`).join(", ")}.`);
  }
  if (catDecl.length) {
    out.push(`Declining categories: ${catDecl.map((c) => `${c.name} (${formatPct(c.trendPct)})`).join(", ")}.`);
  }

  // ── 6
  out.push("\n## Key Opportunities");
  const opportunities: string[] = [];
  if (hasCost && attention.length > 0) {
    const a = attention[0];
    const gap = (meta.businessMarginPct ?? 0) - (a.marginPct ?? 0);
    const uplift = a.revenue * (gap / 100);
    opportunities.push(
      `Bringing **${a.name}** up to the business-average margin would be worth roughly ${formatPKR(uplift)} ` +
        `on its current revenue (${formatPct(gap)} of ${formatPKR(a.revenue)}). *Observation:* this is arithmetic on ` +
        `current figures, not a forecast.`,
    );
  }
  if (catGrow.length > 0) {
    opportunities.push(
      `**${catGrow[0].name}** is growing (${formatPct(catGrow[0].trendPct)}) while contributing ` +
        `${formatPct(catGrow[0].contributionPct)} of revenue — the clearest place additional stock would meet existing demand.`,
    );
  }
  if (growing.length > 0) {
    opportunities.push(
      `**${growing[0].name}** shows the strongest product trend at ${formatPct(growing[0].trendPct)}.`,
    );
  }
  if (patterns.weekendUpliftPct !== null && patterns.weekendUpliftPct > 10) {
    opportunities.push(
      `Weekends already take ${formatPct(patterns.weekendUpliftPct)} more per day than weekdays, so staffing ` +
        `and stock weighted toward ${patterns.bestDayOfWeek} meets demand that is already present.`,
    );
  }
  out.push(
    opportunities.length
      ? opportunities.map((o) => `- ${o}`).join("\n")
      : "- No distinct growth signal stands out in this range. A longer date range usually surfaces more.",
  );

  // ── 7
  out.push("\n## Key Risks");
  const risks: string[] = [];
  if (catDecl.length > 0) {
    risks.push(
      `**${catDecl[0].name}** is declining at ${formatPct(catDecl[0].trendPct)} while still carrying ` +
        `${formatPct(catDecl[0].contributionPct)} of revenue.`,
    );
  }
  if (declining.length > 0) {
    risks.push(
      `${declining.length} product${declining.length === 1 ? " is" : "s are"} declining, led by ` +
        `**${declining[0].name}** (${formatPct(declining[0].trendPct)}).`,
    );
  }
  if (hasCost && lossMakers.length > 0) {
    risks.push(
      `**${lossMakers[0].name}** is sold below cost (${formatPct(lossMakers[0].marginPct)} margin), so each ` +
        `additional unit reduces profit.`,
    );
  }
  if (top) {
    const share = (top.revenue / kpis.totalRevenue) * 100;
    if (share > 20) {
      risks.push(
        `Revenue is concentrated: **${top.name}** alone is ${formatPct(share)} of the total, so a supply or ` +
          `pricing problem there affects the whole business.`,
      );
    }
  }
  if (meta.trendReliability !== "good") {
    risks.push(
      `This range has limited history, so trend figures should be treated as indicative rather than settled.`,
    );
  }
  out.push(
    risks.length
      ? risks.map((r) => `- ${r}`).join("\n")
      : "- No material risk signal appears in this range.",
  );

  // ── 8
  out.push("\n## Recommended Actions");
  const actions: { action: string; reason: string; metric: string }[] = [];
  if (hasCost && attention.length > 0) {
    const a = attention[0];
    actions.push({
      action: `Review the pricing or supplier cost of ${a.name}`,
      reason:
        "It is a top-quarter revenue product with a below-average margin, so a small margin improvement has a large absolute effect.",
      metric: `Revenue ${formatPKR(a.revenue)}; margin ${formatPct(a.marginPct)} vs business average ${formatPct(meta.businessMarginPct)}.`,
    });
  }
  if (hasCost && lossMakers.length > 0) {
    const l = lossMakers[0];
    actions.push({
      action: `Decide whether to reprice or discontinue ${l.name}`,
      reason: "It currently sells below cost, so volume increases losses rather than profit.",
      metric: `Profit ${formatPKR(l.profit)} on ${formatPKR(l.revenue)} revenue (${formatPct(l.marginPct)} margin).`,
    });
  }
  if (declining.length > 0) {
    actions.push({
      action: `Review stock levels for ${declining[0].name}`,
      reason: "A sustained downward trend usually means ordering to yesterday's demand ties up cash.",
      metric: `Modelled trend ${formatPct(declining[0].trendPct)} across the period.`,
    });
  }
  if (catGrow.length > 0) {
    actions.push({
      action: `Consider weighting the next purchase toward ${catGrow[0].name}`,
      reason: "It is the fastest-growing category, so restocking meets demand that already exists.",
      metric: `Category trend ${formatPct(catGrow[0].trendPct)}; ${formatPct(catGrow[0].contributionPct)} of revenue.`,
    });
  }
  if (!hasCost) {
    actions.push({
      action: "Add a cost column to your sales file",
      reason:
        "Every profit, margin and most-profitable figure is unavailable without it, and these are never estimated.",
      metric: `${formatNumber(kpis.transactionCount)} transactions currently carry revenue but no usable cost.`,
    });
  }
  if (patterns.weekendUpliftPct !== null && patterns.weekendUpliftPct > 10 && patterns.bestDayOfWeek) {
    actions.push({
      action: `Test heavier staffing or stock on ${patterns.bestDayOfWeek}`,
      reason: "Demand is already highest then, so the constraint is supply rather than interest.",
      metric: `Weekend uplift ${formatPct(patterns.weekendUpliftPct)} per day vs weekdays.`,
    });
  }
  out.push(
    actions.length
      ? actions
          .map(
            (a, i) =>
              `**${i + 1}. ${a.action}**\n- *Reason:* ${a.reason}\n- *Supporting metric:* ${a.metric}`,
          )
          .join("\n\n")
      : "No action is strongly indicated by this range. Widen the date range or add a cost column for a fuller picture.",
  );

  return out.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Answers to the suggested questions (§16.1), computed rather than generated
// ─────────────────────────────────────────────────────────────────────────────
export function deterministicAnswer(
  question: string,
  dataset: Dataset,
  analytics: AnalyticsResult,
): string {
  const { kpis, meta, patterns, categories, products } = analytics;
  const hasCost = meta.hasCostData;
  const q = question.toLowerCase();
  const ranked = byRevenue(products);
  const cats = [...categories].sort((a, b) => b.revenue - a.revenue);
  const growing = products.filter((p) => p.trendLabel === "growing");
  const declining = products.filter((p) => p.trendLabel === "declining");
  const attention = products.filter((p) => p.badges.includes("needs_attention"));

  const evidence = (lines: string[]) => `\n\n**Evidence**\n${lines.map((l) => `- ${l}`).join("\n")}`;

  // Most profitable / pricing review — both require cost data (§12.5)
  if (q.includes("profitable") || q.includes("pricing review") || q.includes("profit decreasing")) {
    if (!hasCost) {
      return `**What happened**\n${NO_COST_STATEMENT}\n\n**Recommended action**\nAdd a cost column and upload again — revenue, units, orders and trends all work in the meantime.`;
    }
    const byProfit = [...products]
      .filter((p) => p.profit !== null)
      .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0));
    const t = byProfit[0];
    return (
      `**What happened**\n${t.name} generates the most profit at ${formatPKR(t.profit)} on ${formatPKR(t.revenue)} of revenue (${formatPct(t.marginPct)} margin). ` +
      `The business average margin is ${formatPct(meta.businessMarginPct)}.` +
      `\n\n**Why it matters**\nThe highest-revenue product and the highest-profit product are often different, and the second list is the one that pays your bills.` +
      (attention.length
        ? `\n\n**Recommended action**\nReview ${attention[0].name}: it is in the top quarter by revenue but earns only ${formatPct(attention[0].marginPct)}, well below the ${formatPct(meta.businessMarginPct)} average.`
        : "") +
      evidence(
        byProfit
          .slice(0, 3)
          .map((p) => `${p.name}: profit ${formatPKR(p.profit)}, margin ${formatPct(p.marginPct)}`),
      )
    );
  }

  if (q.includes("category")) {
    const b = cats[0];
    return (
      `**What happened**\n${b.name} is the strongest category at ${formatPKR(b.revenue)}, ${formatPct(b.contributionPct)} of total revenue.` +
      `\n\n**Why it matters**\nCategory share tells you where the business actually earns, which is often not where attention goes.` +
      evidence(
        cats
          .slice(0, 4)
          .map(
            (c) =>
              `${c.name}: ${formatPKR(c.revenue)} (${formatPct(c.contributionPct)})${c.trendPct !== null ? `, trend ${formatPct(c.trendPct)}` : ""}`,
          ),
      )
    );
  }

  if (q.includes("focus on")) {
    return (
      `**What happened**\n${ranked[0]?.name} leads on revenue (${formatPKR(ranked[0]?.revenue)}), and ` +
      (growing.length
        ? `${growing[0].name} is growing fastest (${formatPct(growing[0].trendPct)}).`
        : `no product shows a strong upward trend in this range.`) +
      `\n\n**Recommended action**\nConsider protecting the revenue leader and backing the growing line; review anything declining before reordering.` +
      evidence([
        `Top by revenue: ${ranked.slice(0, 3).map((p) => `${p.name} ${formatPKR(p.revenue)}`).join(", ")}`,
        growing.length ? `Growing: ${growing.slice(0, 3).map((p) => `${p.name} ${formatPct(p.trendPct)}`).join(", ")}` : "Growing: none in range",
        declining.length ? `Declining: ${declining.slice(0, 3).map((p) => `${p.name} ${formatPct(p.trendPct)}`).join(", ")}` : "Declining: none in range",
      ])
    );
  }

  if (q.includes("sales change") || q.includes("improve next month")) {
    return (
      `**What happened**\nRevenue ${movement(kpis.growthRatePct)} between the first and second half of this period, ` +
      `finishing at ${formatPKR(kpis.totalRevenue)} across ${formatNumber(kpis.totalOrders)} orders.` +
      (patterns.bestPeriod
        ? ` The strongest period was ${formatPeriod(patterns.bestPeriod.period, analytics.timeSeries.granularity)} (${formatPKR(patterns.bestPeriod.revenue)}).`
        : "") +
      `\n\n**Recommended action**\n` +
      (declining.length
        ? `Look first at ${declining[0].name} (${formatPct(declining[0].trendPct)}) — sustained decline is the clearest thing to act on.`
        : `No single line is dragging results down; the broad pattern is the story here.`) +
      evidence([
        `Revenue ${formatPKR(kpis.totalRevenue)}, orders ${formatNumber(kpis.totalOrders)}, units ${formatNumber(kpis.unitsSold)}`,
        `Average order value ${formatPKR(kpis.averageOrderValue)}`,
        patterns.weekendUpliftPct !== null
          ? `Weekend uplift ${formatPct(patterns.weekendUpliftPct)} per day`
          : `Weekend comparison needs at least three weekends in range`,
      ])
    );
  }

  if (q.includes("recommendation")) {
    // Reuse the report's action list — same rules, same evidence.
    const report = deterministicReport(dataset, analytics, {
      datePreset: "all",
      customRange: null,
      categories: "all",
    });
    return report.slice(report.indexOf("## Recommended Actions"));
  }

  // Anything else: state the headline figures rather than guess at intent.
  return (
    `**What happened**\nOffline analysis can answer the suggested questions below. For this period: ` +
    `${formatPKR(kpis.totalRevenue)} revenue, ${formatNumber(kpis.totalOrders)} orders, ` +
    `${formatNumber(kpis.unitsSold)} units, average order value ${formatPKR(kpis.averageOrderValue)}` +
    (hasCost ? `, profit ${formatPKR(kpis.totalProfit)} (${formatPct(kpis.profitMarginPct)} margin).` : ".") +
    `\n\n**Why it matters**\nFree-form questions need the AI analyst, which requires an API key on this deployment. Everything above is computed from your file.`
  );
}
