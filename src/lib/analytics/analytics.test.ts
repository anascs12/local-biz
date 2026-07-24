import { describe, it, expect } from "vitest";
import type { Transaction } from "@/types/transaction";
import type { DateWindow } from "@/types/analytics";
import { deriveProfit } from "@/lib/parsing/normalize";
import { daysInclusive, startOfWeekMonday, isoDate } from "@/lib/utils/dates";
import { computeKpis, computeGrowthRate, computeDeltas, previousWindow } from "./kpis";
import { computeTrend, classifyTrend } from "./trends";
import { chooseGranularity, buildTimeSeries, bucketStartOf } from "./timeSeries";
import { topCutoff, bottomCutoff, classifyProducts } from "./products";
import { computeCategories } from "./categories";
import type { ProductMetrics } from "@/types/analytics";

// ─── helpers ────────────────────────────────────────────────────────────────
let seq = 0;
function t(
  date: string,
  product: string,
  category: string,
  quantity: number,
  revenue: number,
  cost: number | null,
  order_id: string | null = `ORD-${++seq}`,
): Transaction {
  const d = new Date(`${date}T00:00:00`);
  const { profit, profit_margin } = deriveProfit(revenue, cost);
  return {
    transaction_id: order_id ?? `txn_${seq}`,
    date: d,
    product,
    category,
    quantity,
    revenue,
    cost,
    profit,
    profit_margin,
    customer: null,
    discount: null,
    order_id,
  };
}

function win(start: string, end: string): DateWindow {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return { start: s, end: e, days: daysInclusive(s, e) };
}

const OPTS = { hasCostData: true, hasOrderIds: true };

/** Hand-computed 10-row fixture (§26). */
const FIXTURE: Transaction[] = [
  t("2025-01-01", "A", "Shirts", 1, 1000, 600),
  t("2025-01-02", "A", "Shirts", 2, 2000, 1200),
  t("2025-01-03", "B", "Kurtas", 1, 500, 300),
  t("2025-01-04", "B", "Kurtas", 3, 1500, 900),
  t("2025-01-05", "C", "Shoes", 1, 800, 500),
  t("2025-01-06", "C", "Shoes", 2, 1600, 1000),
  t("2025-01-07", "A", "Shirts", 1, 1000, 600),
  t("2025-01-08", "B", "Kurtas", 1, 500, 300),
  t("2025-01-09", "C", "Shoes", 1, 800, 500),
  t("2025-01-10", "A", "Shirts", 2, 2000, 1200),
];
const FIXTURE_WINDOW = win("2025-01-01", "2025-01-10");

// ─── §13.1 KPIs ─────────────────────────────────────────────────────────────
describe("KPIs against a hand-computed 10-row fixture (§13.1)", () => {
  const k = computeKpis(FIXTURE, FIXTURE_WINDOW, OPTS);

  it("computes revenue, cost, profit and margin", () => {
    expect(k.totalRevenue).toBe(11700);
    expect(k.totalCost).toBe(7100);
    expect(k.totalProfit).toBe(4600);
    expect(k.profitMarginPct).toBeCloseTo((4600 / 11700) * 100, 6); // 39.3162…
  });

  it("computes orders, units and AOV", () => {
    expect(k.totalOrders).toBe(10);
    expect(k.unitsSold).toBe(15);
    expect(k.averageOrderValue).toBe(1170);
  });

  it("counts transactions per order when there are no order ids", () => {
    const noIds = FIXTURE.map((x) => ({ ...x, order_id: null }));
    expect(computeKpis(noIds, FIXTURE_WINDOW, { ...OPTS, hasOrderIds: false }).totalOrders).toBe(10);
  });

  it("hides all profit figures when there is no cost data (§12.5)", () => {
    const k2 = computeKpis(FIXTURE, FIXTURE_WINDOW, { ...OPTS, hasCostData: false });
    expect(k2.totalCost).toBeNull();
    expect(k2.totalProfit).toBeNull();
    expect(k2.profitMarginPct).toBeNull();
    expect(k2.totalRevenue).toBe(11700); // revenue is unaffected
  });
});

describe("guarded denominators — null, never NaN/Infinity (§26)", () => {
  it("returns null margin when costed revenue is 0", () => {
    const rows = [t("2025-01-01", "Free", "Gifts", 1, 0, 0)];
    const k = computeKpis(rows, win("2025-01-01", "2025-01-01"), OPTS);
    expect(k.profitMarginPct).toBeNull();
    expect(Number.isNaN(k.profitMarginPct as unknown as number)).toBe(false);
  });

  it("returns AOV 0 rather than NaN for an empty set", () => {
    const k = computeKpis([], FIXTURE_WINDOW, OPTS);
    expect(k.averageOrderValue).toBe(0);
    expect(k.totalRevenue).toBe(0);
  });

  it("excludes null-cost rows from profit rather than treating them as zero cost (§10.3)", () => {
    const rows = [
      t("2025-01-01", "A", "X", 1, 1000, 600),
      t("2025-01-02", "B", "X", 1, 500, null), // no cost
    ];
    const k = computeKpis(rows, win("2025-01-01", "2025-01-02"), OPTS);
    expect(k.totalRevenue).toBe(1500); // revenue counts every row
    expect(k.totalCost).toBe(600);
    expect(k.totalProfit).toBe(400); // 1000 − 600, NOT 1500 − 600
    expect(k.profitMarginPct).toBeCloseTo(40, 6); // consistent with costed revenue
    expect(k.costedTransactionCount).toBe(1);
    expect(k.transactionCount).toBe(2);
  });
});

// ─── §13.2 growth ───────────────────────────────────────────────────────────
describe("growth rate (§13.2)", () => {
  it("is null with fewer than 14 days of data", () => {
    const g = computeGrowthRate(FIXTURE, FIXTURE_WINDOW);
    expect(g.pct).toBeNull();
    expect(g.reason).toBe("insufficient_days");
  });

  it("is null (not Infinity) when the earlier half has zero revenue", () => {
    const rows = [t("2025-01-20", "A", "X", 1, 1000, 600)];
    const g = computeGrowthRate(rows, win("2025-01-01", "2025-01-28"));
    expect(g.pct).toBeNull();
    expect(g.reason).toBe("zero_baseline");
  });

  it("computes a real growth percentage across two equal halves", () => {
    const rows = [
      t("2025-01-02", "A", "X", 1, 1000, 600), // first half
      t("2025-01-20", "A", "X", 1, 1500, 900), // second half
    ];
    const g = computeGrowthRate(rows, win("2025-01-01", "2025-01-28"));
    expect(g.reason).toBeNull();
    expect(g.pct).toBeCloseTo(50, 6); // (1500 − 1000) / 1000
  });
});

// ─── §13.3 deltas ───────────────────────────────────────────────────────────
describe("period-over-period deltas (§13.3)", () => {
  it("suppresses deltas entirely when history does not reach back", () => {
    const d = computeDeltas(computeKpis(FIXTURE, FIXTURE_WINDOW, OPTS), null);
    expect(d.available).toBe(false);
    expect(d.revenuePct).toBeNull();
  });

  it("derives the immediately preceding window of equal length", () => {
    const prev = previousWindow(win("2025-02-01", "2025-02-28"));
    expect(isoDate(prev.end)).toBe("2025-01-31");
    expect(isoDate(prev.start)).toBe("2025-01-04");
    expect(prev.days).toBe(28);
  });

  it("computes percentage change and margin point delta", () => {
    const cur = computeKpis([t("2025-02-01", "A", "X", 1, 1500, 900)], win("2025-02-01", "2025-02-01"), OPTS);
    const prev = computeKpis([t("2025-01-01", "A", "X", 1, 1000, 600)], win("2025-01-01", "2025-01-01"), OPTS);
    const d = computeDeltas(cur, prev);
    expect(d.available).toBe(true);
    expect(d.revenuePct).toBeCloseTo(50, 6);
    expect(d.marginPointDelta).toBeCloseTo(0, 6); // both 40% margin
  });
});

// ─── §13.5 trends ───────────────────────────────────────────────────────────
describe("trend regression (§13.5)", () => {
  it("is positive for a rising series and negative for a falling one", () => {
    expect(computeTrend([1, 2, 3, 4]).pct).toBeCloseTo(160, 6);
    expect(computeTrend([4, 3, 2, 1]).pct).toBeCloseTo(-160, 6);
  });

  it("is ~0 for a flat series", () => {
    const r = computeTrend([5, 5, 5, 5]);
    expect(r.pct).toBeCloseTo(0, 10);
    expect(r.label).toBe("stable");
  });

  it("is null with fewer than 4 non-empty buckets", () => {
    expect(computeTrend([1, 2, 3]).pct).toBeNull();
    expect(computeTrend([1, 2, 0, 0, 3]).pct).toBeNull(); // only 3 non-empty
    expect(computeTrend([1, 2, 3]).label).toBe("insufficient");
  });

  it("classifies at the ±15% thresholds", () => {
    expect(classifyTrend(15)).toBe("growing");
    expect(classifyTrend(-15)).toBe("declining");
    expect(classifyTrend(14.9)).toBe("stable");
    expect(classifyTrend(null)).toBe("insufficient");
  });
});

// ─── §13.4 time series ──────────────────────────────────────────────────────
describe("time series bucketing (§13.4)", () => {
  it("chooses granularity at the documented boundaries", () => {
    expect(chooseGranularity(31)).toBe("daily");
    expect(chooseGranularity(32)).toBe("weekly");
    expect(chooseGranularity(120)).toBe("weekly");
    expect(chooseGranularity(121)).toBe("monthly");
  });

  it("uses Monday-start ISO weeks", () => {
    // 2025-01-01 is a Wednesday → its week starts Mon 2024-12-30
    expect(isoDate(startOfWeekMonday(new Date("2025-01-01T00:00:00")))).toBe("2024-12-30");
    expect(isoDate(bucketStartOf(new Date("2025-01-01T00:00:00"), "weekly"))).toBe("2024-12-30");
  });

  it("emits empty buckets with zeros rather than skipping them", () => {
    const rows = [
      t("2025-01-01", "A", "X", 1, 100, 60),
      t("2025-01-05", "A", "X", 1, 200, 120),
    ];
    const ts = buildTimeSeries(rows, win("2025-01-01", "2025-01-05"), "daily", OPTS);
    expect(ts.points).toHaveLength(5);
    expect(ts.points.map((p) => p.revenue)).toEqual([100, 0, 0, 0, 200]);
    expect(ts.points[1].orders).toBe(0);
    expect(ts.points[1].averageOrderValue).toBe(0);
  });

  it("reports null profit per point when there is no cost data", () => {
    const ts = buildTimeSeries(FIXTURE, FIXTURE_WINDOW, "daily", { ...OPTS, hasCostData: false });
    expect(ts.points.every((p) => p.profit === null && p.cost === null)).toBe(true);
  });
});

// ─── §13.6 classification cutoffs and ties ──────────────────────────────────
describe("classification cutoffs and ties (§13.6 / §26)", () => {
  it("computes top and bottom cutoffs by value", () => {
    const v = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(topCutoff(v, 0.1)).toBe(100); // ceil(10 × 0.1) = 1
    expect(bottomCutoff(v, 0.25)).toBe(30); // ceil(10 × 0.25) = 3
  });

  it("includes every product tied at the cutoff", () => {
    expect(topCutoff([50, 50, 10, 10], 0.1)).toBe(50); // both 50s qualify
  });

  it("awards badges by the §13.6 rules", () => {
    const mk = (name: string, units: number, revenue: number, profit: number, marginPct: number): ProductMetrics => ({
      name, category: "X", unitsSold: units, revenue, cost: revenue - profit, profit, marginPct,
      transactionCount: 1, trendPct: 0, trendLabel: "stable", revenueSeries: [], badges: [],
    });
    const products = [
      mk("Top", 100, 10000, 1000, 10), // top revenue, low margin
      mk("Mid", 50, 5000, 2000, 40),
      mk("Low", 5, 500, 200, 40),
      mk("Tiny", 1, 100, 40, 40),
    ];
    classifyProducts(products, { hasCostData: true, businessMarginPct: 30 });

    const badges = (n: string) => products.find((p) => p.name === n)!.badges;
    expect(badges("Top")).toContain("best_seller"); // top 10% units
    expect(badges("Top")).toContain("needs_attention"); // top 25% revenue, 10% < 30−5
    expect(badges("Mid")).toContain("most_profitable"); // top 10% profit
    expect(badges("Tiny")).toContain("low_volume"); // bottom 25% units
    expect(badges("Mid")).not.toContain("needs_attention"); // margin is above average
  });

  it("never awards profit-based badges without cost data (§12.5)", () => {
    const products: ProductMetrics[] = [
      { name: "A", category: "X", unitsSold: 10, revenue: 1000, cost: null, profit: null, marginPct: null, transactionCount: 1, trendPct: 0, trendLabel: "stable", revenueSeries: [], badges: [] },
    ];
    classifyProducts(products, { hasCostData: false, businessMarginPct: null });
    expect(products[0].badges).not.toContain("most_profitable");
    expect(products[0].badges).not.toContain("needs_attention");
  });
});

// ─── §13.7 categories ───────────────────────────────────────────────────────
describe("category metrics (§13.7)", () => {
  const cats = computeCategories(FIXTURE, FIXTURE_WINDOW, "daily", { hasCostData: true });

  it("aggregates revenue and margin per category", () => {
    const shirts = cats.find((c) => c.name === "Shirts")!;
    expect(shirts.revenue).toBe(6000);
    expect(shirts.unitsSold).toBe(6);
    expect(shirts.profit).toBe(2400);
    expect(shirts.marginPct).toBeCloseTo(40, 6);
  });

  it("contribution percentages sum to 100 (±0.01)", () => {
    const sum = cats.reduce((s, c) => s + c.contributionPct, 0);
    expect(Math.abs(sum - 100)).toBeLessThan(0.01);
  });
});
