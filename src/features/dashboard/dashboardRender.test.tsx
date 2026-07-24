import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { computeAnalytics } from "@/lib/analytics";
import { formatPKR } from "@/lib/utils/format";
import { KpiGrid } from "./KpiGrid";
import { ProductPerformanceTable } from "./ProductPerformanceTable";
import type { Dataset } from "@/types/dataset";

/**
 * Render smoke tests for the dashboard's display layer.
 *
 * These assert that the numbers the analytics engine computes actually reach
 * the screen correctly formatted — the step between "the maths is right" and
 * "the user sees the right thing", which a unit test of the maths alone misses.
 */
const dataset = loadDemoDataset();
const analytics = computeAnalytics(dataset, DEFAULT_FILTERS);

describe("KpiGrid", () => {
  const html = renderToStaticMarkup(<KpiGrid analytics={analytics} />);

  it("renders all six KPI labels (§9.3)", () => {
    for (const label of [
      "Total Revenue",
      "Total Profit",
      "Profit Margin",
      "Total Orders",
      "Units Sold",
      "Growth Rate",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("renders the real computed totals in PKR, not placeholders", () => {
    expect(html).toContain(formatPKR(analytics.kpis.totalRevenue));
    expect(html).toContain(formatPKR(analytics.kpis.totalProfit));
    expect(html).toContain("Rs.&#x27;".slice(0, 3)); // "Rs." prefix present
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null%");
  });

  it("shows the cost-data explanation instead of a zero when cost is absent (§12.5)", () => {
    const noCost: Dataset = { ...dataset, hasCostData: false };
    const noCostHtml = renderToStaticMarkup(
      <KpiGrid analytics={computeAnalytics(noCost, DEFAULT_FILTERS)} />,
    );
    expect(noCostHtml).toContain("Add a cost column to unlock profit analysis");
    // No profit figure may appear anywhere (§30 criterion 19).
    expect(noCostHtml).not.toContain(formatPKR(analytics.kpis.totalProfit));
  });
});

describe("ProductPerformanceTable", () => {
  it("renders 10 rows with product names, figures and badges", () => {
    const html = renderToStaticMarkup(
      <ProductPerformanceTable products={analytics.products} hasCostData={true} />,
    );
    expect(html).toContain("Classic Blue Shirt");
    expect(html).toContain("Needs Attention"); // badge word, not color alone (§20.7)
    expect(html).toContain(formatPKR(analytics.products.find((p) => p.name === "Classic Blue Shirt")!.revenue));
    expect(html).not.toContain("NaN");
    // 10 visible rows (§9.3)
    expect((html.match(/<tr/g) ?? []).length).toBe(11); // 10 body rows + header
  });

  it("omits profit and margin columns entirely without cost data (§12.5)", () => {
    const html = renderToStaticMarkup(
      <ProductPerformanceTable products={analytics.products} hasCostData={false} />,
    );
    expect(html).not.toContain(">Profit<");
    expect(html).not.toContain(">Margin<");
  });
});
