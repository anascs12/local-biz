import { describe, it, expect } from "vitest";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { computeAnalytics } from "@/lib/analytics";
import { deterministicReport, deterministicAnswer } from "./deterministic";
import { REPORT_SECTIONS } from "./uiCopy";
import { suggestedQuestions } from "./uiCopy";
import type { Dataset } from "@/types/dataset";

/**
 * The offline path exists so a deployment without a paid API key still works.
 * It must be (a) grounded — every figure traceable to the analytics, and
 * (b) subject to the same §12.5 cost rule as the AI path.
 */
const dataset = loadDemoDataset();
const analytics = computeAnalytics(dataset, DEFAULT_FILTERS);
const report = deterministicReport(dataset, analytics, DEFAULT_FILTERS);

const noCostDataset = { ...dataset, hasCostData: false } as Dataset;
const noCostAnalytics = computeAnalytics(noCostDataset, DEFAULT_FILTERS);
const noCostReport = deterministicReport(noCostDataset, noCostAnalytics, DEFAULT_FILTERS);

describe("deterministic report — structure (§18)", () => {
  it("emits all eight sections in order", () => {
    let cursor = -1;
    for (const section of REPORT_SECTIONS) {
      const at = report.indexOf(`## ${section}`);
      expect(at, `missing: ${section}`).toBeGreaterThan(-1);
      expect(at, `out of order: ${section}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("uses the metric-backed recommendation format", () => {
    expect(report).toContain("*Reason:*");
    expect(report).toContain("*Supporting metric:*");
    expect(report).toMatch(/\*\*1\. /);
  });
});

describe("deterministic report — grounded, never invented", () => {
  it("quotes the real computed totals", () => {
    const revenue = Math.round(analytics.kpis.totalRevenue).toLocaleString("en-PK");
    expect(report).toContain(revenue);
    expect(report).toContain(analytics.kpis.totalOrders.toLocaleString("en-PK"));
  });

  it("names real products and categories from the dataset", () => {
    const top = [...analytics.products].sort((a, b) => b.revenue - a.revenue)[0];
    expect(report).toContain(top.name);
    const realNames = new Set(analytics.products.map((p) => p.name));
    expect(realNames.has(top.name)).toBe(true);
  });

  it("surfaces the planted patterns from the demo data (§14.2)", () => {
    expect(report).toContain("Classic Blue Shirt"); // top revenue / needs attention
    expect(report).toMatch(/Accessories|Outerwear/); // declining / growing categories
  });

  it("contains no NaN, undefined, null or Infinity", () => {
    for (const bad of ["NaN", "undefined", "null", "Infinity"]) {
      expect(report, `report leaked ${bad}`).not.toContain(bad);
    }
  });

  it("never leaks customer data (§16 privacy)", () => {
    const customers = new Set(
      dataset.transactions.map((t) => t.customer).filter((c): c is string => c !== null),
    );
    for (const c of customers) expect(report).not.toContain(c);
  });
});

describe("deterministic report — §12.5 cost rule holds without a model", () => {
  it("states profit is unavailable and estimates nothing", () => {
    const profitability = noCostReport.slice(
      noCostReport.indexOf("## Profitability"),
      noCostReport.indexOf("## Product Performance"),
    );
    expect(profitability).toMatch(/unavailable/i);
    expect(profitability).toMatch(/never estimated/i);
  });

  it("prints no margin percentage anywhere without cost data", () => {
    // A margin figure would mean profit was inferred — the one thing §12.5 forbids.
    expect(noCostReport).not.toMatch(/\d+\.\d+% margin/);
  });

  it("still reports revenue, orders and units", () => {
    expect(noCostReport).toContain("## Sales Performance");
    expect(noCostReport).toContain(
      Math.round(noCostAnalytics.kpis.totalRevenue).toLocaleString("en-PK"),
    );
  });

  it("recommends adding a cost column", () => {
    expect(noCostReport).toMatch(/Add a cost column/i);
  });
});

describe("deterministic answers (§16.1)", () => {
  it("answers every suggested question with real figures", () => {
    for (const q of suggestedQuestions(true)) {
      const a = deterministicAnswer(q, dataset, analytics);
      expect(a.length, `empty answer for: ${q}`).toBeGreaterThan(60);
      expect(a, `answer leaked NaN for: ${q}`).not.toContain("NaN");
      expect(a, `answer leaked undefined for: ${q}`).not.toContain("undefined");
    }
  });

  it("refuses to give profit answers without cost data (§12.5)", () => {
    const a = deterministicAnswer(
      "What are my most profitable products?",
      noCostDataset,
      noCostAnalytics,
    );
    expect(a).toMatch(/unavailable/i);
    expect(a).not.toMatch(/\d+\.\d+% margin/);
  });

  it("handles an unrecognised question without inventing an answer", () => {
    const a = deterministicAnswer("What will my sales be next year?", dataset, analytics);
    // States what it has; makes no forecast.
    expect(a).toMatch(/requires an API key|computed from your file/i);
    expect(a).not.toMatch(/will be|forecast|predict/i);
  });
});
