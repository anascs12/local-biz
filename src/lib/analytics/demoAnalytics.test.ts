import { describe, it, expect } from "vitest";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { computeAnalytics } from "./index";

/**
 * Closes the loop: the analytics engine must independently rediscover every
 * pattern the generator planted (§14.2), using only the §13 formulas. This is
 * the cross-check §30 criterion 3 asks for, expressed as a test.
 */
describe("analytics engine over the demo dataset", () => {
  const dataset = loadDemoDataset();
  const a = computeAnalytics(dataset, DEFAULT_FILTERS);
  const product = (n: string) => a.products.find((p) => p.name === n)!;
  const category = (n: string) => a.categories.find((c) => c.name === n)!;

  it("buckets a 6-month range monthly (§13.4)", () => {
    expect(a.window.days).toBeGreaterThan(120);
    expect(a.granularity).toBe("monthly");
    expect(a.timeSeries.points).toHaveLength(6);
  });

  it("KPI totals equal a straight sum of the rows (grounded, §13.1)", () => {
    const revenue = dataset.transactions.reduce((s, t) => s + t.revenue, 0);
    const units = dataset.transactions.reduce((s, t) => s + t.quantity, 0);
    expect(a.kpis.totalRevenue).toBeCloseTo(revenue, 6);
    expect(a.kpis.unitsSold).toBe(units);
    expect(a.kpis.totalOrders).toBe(520); // unique order ids
    expect(a.meta.hasCostData).toBe(true);
    expect(a.meta.trendReliability).toBe("good");
  });

  it("pattern 1 — Classic Blue Shirt: top revenue, low margin, 🔎 Needs Attention", () => {
    const cbs = product("Classic Blue Shirt");
    const topByRevenue = [...a.products].sort((x, y) => y.revenue - x.revenue)[0];
    expect(topByRevenue.name).toBe("Classic Blue Shirt");
    expect(cbs.marginPct!).toBeLessThan(a.meta.businessMarginPct! - 5);
    expect(cbs.badges).toContain("needs_attention");
  });

  it("pattern 2 — Silk Dupatta: 💰 Most Profitable but NOT 🔥 Best Seller", () => {
    const dup = product("Silk Dupatta");
    expect(dup.badges).toContain("most_profitable");
    expect(dup.badges).not.toContain("best_seller");
    expect(dup.marginPct!).toBeGreaterThan(45);
  });

  it("patterns 3 & 4 — Accessories declining, Outerwear growing", () => {
    expect(category("Accessories").trendLabel).toBe("declining");
    expect(category("Outerwear").trendLabel).toBe("growing");
  });

  it("patterns 5 & 6 — Printed T-Shirt declining, Wool Blend Coat growing", () => {
    expect(product("Printed T-Shirt").badges).toContain("declining");
    expect(product("Wool Blend Coat").badges).toContain("growing");
  });

  it("pattern 7 — a weekend uplift is detected (§13.8)", () => {
    expect(a.patterns.weekendUpliftPct).not.toBeNull();
    expect(a.patterns.bestDayOfWeek).not.toBeNull();
    expect(a.patterns.dayOfWeek).toHaveLength(7);
    // every weekday occurs many times across 6 months
    expect(a.patterns.dayOfWeek.every((d) => d.occurrences > 20)).toBe(true);
  });

  it("pattern 9 — Clearance Chappal is loss-making (negative margin is real, §10.4)", () => {
    expect(product("Clearance Chappal").profit!).toBeLessThan(0);
  });

  it("category contributions sum to 100 (±0.01) and anomalies are found", () => {
    const sum = a.categories.reduce((s, c) => s + c.contributionPct, 0);
    expect(Math.abs(sum - 100)).toBeLessThan(0.01);
    expect(a.anomalies.length).toBeGreaterThan(0);
    expect(a.anomalies.some((x) => x.type === "margin_outlier")).toBe(true);
  });

  it("category filtering narrows every downstream metric consistently", () => {
    const shirtsOnly = computeAnalytics(dataset, { ...DEFAULT_FILTERS, categories: ["Shirts"] });
    expect(shirtsOnly.categories).toHaveLength(1);
    expect(shirtsOnly.categories[0].contributionPct).toBeCloseTo(100, 6);
    expect(shirtsOnly.kpis.totalRevenue).toBeLessThan(a.kpis.totalRevenue);
    expect(shirtsOnly.filtered.every((t) => t.category === "Shirts")).toBe(true);
  });
});
