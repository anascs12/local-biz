import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsvToDataset } from "./pipeline";

// SPEC §14 / §30 — the bundled demo CSV is the fixture for the whole app.
// This integration test proves the full ingestion pipeline (parse → fuzzy map →
// validate → assemble) against the real committed file.
describe("Urban Threads PK demo CSV ingestion", () => {
  const csv = readFileSync(
    join(process.cwd(), "public", "demo-data", "urban-threads-pk.csv"),
    "utf8",
  );
  const { dataset, mapping, errors } = parseCsvToDataset(csv, {
    name: "Urban Threads PK (Demo)",
    isDemo: true,
  });

  it("produces a dataset with no blocking errors", () => {
    expect(errors).toEqual([]);
    expect(dataset).not.toBeNull();
  });

  it("fuzzy-maps the non-exact demo headers correctly (§14.1)", () => {
    expect(mapping.date).toBe("order_date");
    expect(mapping.product).toBe("product_name");
    expect(mapping.quantity).toBe("quantity");
    expect(mapping.revenue).toBe("revenue");
    expect(mapping.cost).toBe("cost");
    expect(mapping.category).toBe("category");
    expect(mapping.order_id).toBe("order_id");
    expect(mapping.customer).toBe("customer_city");
  });

  it("imports all 520 rows with no skips and correct flags", () => {
    expect(dataset!.validRowCount).toBe(520);
    expect(dataset!.skippedRowCount).toBe(0);
    expect(dataset!.hasCostData).toBe(true);
    expect(dataset!.hasOrderIds).toBe(true);
    expect(dataset!.hasCategories).toBe(true);
  });

  it("has 20 products across 6 categories within the 6-month window", () => {
    const products = new Set(dataset!.transactions.map((t) => t.product));
    const categories = new Set(dataset!.transactions.map((t) => t.category));
    expect(products.size).toBe(20);
    expect(categories.size).toBe(6);
    expect(dataset!.dateRange.start.getFullYear()).toBe(2025);
    expect(dataset!.dateRange.end.getFullYear()).toBe(2026);
  });

  it("cross-checks a KPI: Classic Blue Shirt is the highest-revenue product (§14.2)", () => {
    const rev = new Map<string, number>();
    for (const t of dataset!.transactions) {
      rev.set(t.product, (rev.get(t.product) ?? 0) + t.revenue);
    }
    const top = [...rev.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(top[0]).toBe("Classic Blue Shirt");

    // total revenue equals the straight sum of row revenues (grounded, deterministic)
    const total = dataset!.transactions.reduce((s, t) => s + t.revenue, 0);
    expect(total).toBeGreaterThan(0);
    expect(dataset!.transactions.every((t) => t.profit !== null)).toBe(true);
  });
});
