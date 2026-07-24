import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { loadDemoDataset } from "@/lib/demo/loadDemo";
import { DEFAULT_FILTERS } from "@/context/FilterContext";
import { computeAnalytics } from "@/lib/analytics";
import { formatPKR } from "@/lib/utils/format";
import { ProductTable } from "./ProductTable";
import { countByBadge, visibleBadges } from "./ClassificationChips";
import { CategoryTable } from "@/features/categories/CategoryTable";
import { CategoryCards } from "@/features/categories/CategoryCards";
import type { Dataset } from "@/types/dataset";

const dataset = loadDemoDataset();
const analytics = computeAnalytics(dataset, DEFAULT_FILTERS);
const noCost = computeAnalytics({ ...dataset, hasCostData: false } as Dataset, DEFAULT_FILTERS);

describe("classification chips (§9.5 / §12.5.3)", () => {
  it("counts products per classification", () => {
    const best = countByBadge(analytics.products, "best_seller");
    const attention = countByBadge(analytics.products, "needs_attention");
    expect(best).toBeGreaterThan(0);
    expect(attention).toBeGreaterThan(0);
    // Counts must agree with the badges actually on the products.
    expect(analytics.products.filter((p) => p.badges.includes("best_seller"))).toHaveLength(best);
  });

  it("hides cost-dependent chips entirely when there is no cost data", () => {
    expect(visibleBadges(true)).toContain("most_profitable");
    expect(visibleBadges(true)).toContain("needs_attention");
    expect(visibleBadges(false)).not.toContain("most_profitable");
    expect(visibleBadges(false)).not.toContain("needs_attention");
  });
});

describe("ProductTable (§9.5)", () => {
  it("renders every product with figures, trend and badges", () => {
    const html = renderToStaticMarkup(
      <ProductTable products={analytics.products} hasCostData={true} />,
    );
    expect(html).toContain("Classic Blue Shirt");
    expect(html).toContain("Silk Dupatta");
    expect(html).toContain("Needs Attention");
    expect(html).toContain(
      formatPKR(analytics.products.find((p) => p.name === "Classic Blue Shirt")!.revenue),
    );
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    // header + one row per product
    expect((html.match(/<tr/g) ?? []).length).toBe(analytics.products.length + 1);
  });

  it("omits Cost/Profit/Margin columns without cost data (§12.5)", () => {
    const html = renderToStaticMarkup(
      <ProductTable products={noCost.products} hasCostData={false} />,
    );
    expect(html).not.toContain(">Cost<");
    expect(html).not.toContain(">Profit<");
    expect(html).not.toContain(">Margin<");
    expect(html).toContain(">Revenue<");
  });

  it("shows a clear message when a classification filter matches nothing", () => {
    const html = renderToStaticMarkup(<ProductTable products={[]} hasCostData={true} />);
    expect(html).toContain("No products match this classification");
  });
});

describe("Category Intelligence (§9.6)", () => {
  it("renders highlight cards for revenue, profit and trend leaders", () => {
    const html = renderToStaticMarkup(
      <CategoryCards categories={analytics.categories} hasCostData={true} />,
    );
    expect(html).toContain("Best category");
    expect(html).toContain("Most profitable");
    expect(html).toContain("Fastest growing");
    expect(html).toContain("Declining");
    expect(html).toContain("Outerwear"); // the planted growing category
    expect(html).not.toContain("NaN");
  });

  it("drops the profit highlight card without cost data (§12.5)", () => {
    const html = renderToStaticMarkup(
      <CategoryCards categories={noCost.categories} hasCostData={false} />,
    );
    expect(html).not.toContain("Most profitable");
    expect(html).toContain("Best category");
  });

  it("renders the category table with contribution percentages", () => {
    const html = renderToStaticMarkup(
      <CategoryTable categories={analytics.categories} hasCostData={true} />,
    );
    expect(html).toContain("Contribution");
    expect(html).toContain("Accessories");
    expect((html.match(/<tr/g) ?? []).length).toBe(analytics.categories.length + 1);
    expect(html).not.toContain("NaN");
  });
});
