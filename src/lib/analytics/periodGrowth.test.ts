import { describe, it, expect } from "vitest";
import type { Transaction } from "@/types/transaction";
import type { DateWindow } from "@/types/analytics";
import { deriveProfit } from "@/lib/parsing/normalize";
import { daysInclusive } from "@/lib/utils/dates";
import { computePeriodGrowth } from "./kpis";
import { buildTimeSeries, chooseGranularity } from "./timeSeries";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { computeAnalytics } from "./index";

// SPEC §9.4 / §13.2 / §13.4
let seq = 0;
function t(date: string, revenue: number, quantity = 1, orderId?: string): Transaction {
  const cost = Math.round(revenue * 0.7);
  const { profit, profit_margin } = deriveProfit(revenue, cost);
  seq++;
  return {
    transaction_id: `txn_${seq}`,
    date: new Date(`${date}T00:00:00`),
    product: "P",
    category: "C",
    quantity,
    revenue,
    cost,
    profit,
    profit_margin,
    customer: null,
    discount: null,
    order_id: orderId ?? `ORD-${seq}`,
  };
}

function win(start: string, end: string): DateWindow {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return { start: s, end: e, days: daysInclusive(s, e) };
}

describe("computePeriodGrowth (§9.4 summary strip)", () => {
  it("needs at least 14 days", () => {
    const g = computePeriodGrowth([t("2025-01-01", 100)], win("2025-01-01", "2025-01-10"), {
      hasOrderIds: true,
    });
    expect(g.reason).toBe("insufficient_days");
    expect(g.revenuePct).toBeNull();
    expect(g.ordersPct).toBeNull();
    expect(g.aovPct).toBeNull();
  });

  it("computes revenue, orders and AOV growth across the two halves", () => {
    const rows = [
      // first half: 2 orders, 1000 revenue, AOV 500
      t("2025-01-02", 400),
      t("2025-01-05", 600),
      // second half: 3 orders, 2400 revenue, AOV 800
      t("2025-01-20", 800),
      t("2025-01-22", 800),
      t("2025-01-25", 800),
    ];
    const g = computePeriodGrowth(rows, win("2025-01-01", "2025-01-28"), { hasOrderIds: true });
    expect(g.reason).toBeNull();
    expect(g.revenuePct).toBeCloseTo(140, 6); // 1000 → 2400
    expect(g.ordersPct).toBeCloseTo(50, 6); // 2 → 3
    expect(g.aovPct).toBeCloseTo(60, 6); // 500 → 800
  });

  it("returns null (not Infinity) when the earlier half has no revenue", () => {
    const g = computePeriodGrowth([t("2025-01-25", 900)], win("2025-01-01", "2025-01-28"), {
      hasOrderIds: true,
    });
    expect(g.reason).toBe("zero_baseline");
    expect(g.revenuePct).toBeNull();
    expect(Number.isFinite(g.revenuePct as unknown as number)).toBe(false);
  });

  it("counts each row as an order when there are no order ids (§9.4)", () => {
    const rows = [t("2025-01-02", 500), t("2025-01-20", 500), t("2025-01-21", 500)];
    const g = computePeriodGrowth(rows, win("2025-01-01", "2025-01-28"), { hasOrderIds: false });
    expect(g.ordersPct).toBeCloseTo(100, 6); // 1 → 2 rows
  });
});

describe("granularity override (§13.4)", () => {
  const dataset = loadDemoDataset();
  const analytics = computeAnalytics(dataset, DEFAULT_FILTERS);

  it("defaults to the automatic granularity for the range", () => {
    expect(analytics.granularity).toBe(chooseGranularity(analytics.window.days));
    expect(analytics.granularity).toBe("monthly"); // 6-month demo window
  });

  it("re-buckets every measure when the user overrides it", () => {
    const opts = { hasCostData: dataset.hasCostData, hasOrderIds: dataset.hasOrderIds };
    const daily = buildTimeSeries(analytics.filtered, analytics.window, "daily", opts);
    const weekly = buildTimeSeries(analytics.filtered, analytics.window, "weekly", opts);
    const monthly = buildTimeSeries(analytics.filtered, analytics.window, "monthly", opts);

    expect(daily.points.length).toBeGreaterThan(weekly.points.length);
    expect(weekly.points.length).toBeGreaterThan(monthly.points.length);

    // Totals are invariant under re-bucketing — the same rows, grouped differently.
    const sum = (pts: { revenue: number }[]) => pts.reduce((s, p) => s + p.revenue, 0);
    expect(sum(daily.points)).toBeCloseTo(sum(monthly.points), 4);
    expect(sum(weekly.points)).toBeCloseTo(sum(monthly.points), 4);

    const units = (pts: { units: number }[]) => pts.reduce((s, p) => s + p.units, 0);
    expect(units(daily.points)).toBe(units(monthly.points));
  });
});

describe("day-of-week data feeding the weekend chart (§13.8)", () => {
  const analytics = computeAnalytics(loadDemoDataset(), DEFAULT_FILTERS);

  it("provides all seven weekdays with occurrence counts", () => {
    expect(analytics.patterns.dayOfWeek).toHaveLength(7);
    expect(analytics.patterns.dayOfWeek.every((d) => d.occurrences > 0)).toBe(true);
  });

  it("detects the planted weekend uplift", () => {
    expect(analytics.patterns.weekendUpliftPct).not.toBeNull();
    expect(analytics.patterns.weekendUpliftPct!).toBeGreaterThan(0);
  });
});
