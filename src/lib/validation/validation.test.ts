import { describe, it, expect } from "vitest";
import { buildDatasetAuto } from "@/lib/parsing/pipeline";
import type { RawRow } from "@/lib/parsing/columnMapper";

// SPEC §12 / §10.3 / §10.4 / §26

const HEADERS = ["date", "product", "quantity", "revenue", "cost"];
const NO_COST_HEADERS = ["date", "product", "quantity", "revenue"];

function day(i: number): string {
  return `2025-08-${String((i % 28) + 1).padStart(2, "0")}`;
}

describe("row validation (§12.3)", () => {
  it("rejects unparseable dates, empty products, and non-positive quantities", () => {
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "Blue Shirt", quantity: "2", revenue: "4800", cost: "3900" },
      { date: "banana", product: "Blue Shirt", quantity: "2", revenue: "4800", cost: "3900" },
      { date: "2025-08-03", product: "   ", quantity: "2", revenue: "4800", cost: "3900" },
      { date: "2025-08-04", product: "Cap", quantity: "0", revenue: "800", cost: "600" },
      { date: "2025-08-05", product: "Cap", quantity: "-1", revenue: "800", cost: "600" },
    ];
    const { dataset } = buildDatasetAuto(HEADERS, rows, { name: "t" });
    expect(dataset).not.toBeNull();
    expect(dataset!.validRowCount).toBe(1);
    expect(dataset!.skippedRowCount).toBe(4);
    const codes = dataset!.issues.map((i) => i.code);
    expect(codes).toContain("unreadable_date");
    expect(codes).toContain("empty_product");
    expect(codes).toContain("invalid_quantity");
  });

  it("keeps negative revenue but flags it as a likely return", () => {
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "Shirt", quantity: "1", revenue: "-500", cost: "300" },
      { date: "2025-08-02", product: "Shirt", quantity: "1", revenue: "500", cost: "300" },
    ];
    const { dataset } = buildDatasetAuto(HEADERS, rows, { name: "t" });
    expect(dataset!.validRowCount).toBe(2);
    expect(dataset!.issues.find((i) => i.code === "negative_revenue")?.count).toBe(1);
  });

  it("flags exact duplicates without removing them by default (§10.4)", () => {
    const dup: RawRow = { date: "2025-08-01", product: "Shirt", quantity: "2", revenue: "4800", cost: "3900" };
    const { dataset } = buildDatasetAuto(HEADERS, [dup, { ...dup }], { name: "t" });
    expect(dataset!.validRowCount).toBe(2);
    expect(dataset!.issues.find((i) => i.code === "duplicate_row")?.count).toBe(1);
  });
});

describe("product name normalization (§10.4)", () => {
  it("groups casing/whitespace variants into one product", () => {
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "blue shirt", quantity: "1", revenue: "500", cost: "300" },
      { date: "2025-08-02", product: "  Blue   Shirt ", quantity: "1", revenue: "500", cost: "300" },
    ];
    const { dataset } = buildDatasetAuto(HEADERS, rows, { name: "t" });
    const names = new Set(dataset!.transactions.map((t) => t.product));
    expect([...names]).toEqual(["Blue Shirt"]);
  });

  it("preserves capitalization after a hyphen (T-Shirt, not T-shirt)", () => {
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "Printed T-Shirt", quantity: "1", revenue: "500", cost: "300" },
      { date: "2025-08-02", product: "printed t-shirt", quantity: "1", revenue: "500", cost: "300" },
    ];
    const { dataset } = buildDatasetAuto(HEADERS, rows, { name: "t" });
    const names = new Set(dataset!.transactions.map((t) => t.product));
    expect([...names]).toEqual(["Printed T-Shirt"]);
  });
});

describe("derived profit/margin (§10.3)", () => {
  it("returns null profit/margin when there is no cost column", () => {
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "Shirt", quantity: "1", revenue: "500" },
      { date: "2025-08-02", product: "Shirt", quantity: "1", revenue: "700" },
    ];
    const { dataset } = buildDatasetAuto(NO_COST_HEADERS, rows, { name: "t" });
    expect(dataset!.hasCostData).toBe(false);
    expect(dataset!.transactions.every((t) => t.profit === null && t.profit_margin === null)).toBe(true);
  });

  it("returns null margin (not NaN/Infinity) when revenue is 0", () => {
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "Free Gift", quantity: "1", revenue: "0", cost: "0" },
      { date: "2025-08-02", product: "Shirt", quantity: "1", revenue: "500", cost: "300" },
    ];
    const { dataset } = buildDatasetAuto(HEADERS, rows, { name: "t" });
    const free = dataset!.transactions.find((t) => t.product === "Free Gift")!;
    expect(free.profit).toBe(0);
    expect(free.profit_margin).toBeNull();
  });
});

describe("hasCostData threshold at the 80% boundary (§10.3 / §26)", () => {
  function build(withCost: number) {
    const rows: RawRow[] = [];
    for (let i = 0; i < 100; i++) {
      rows.push({
        date: day(i),
        product: `Product ${i % 6}`,
        quantity: "2",
        revenue: String(1000 + i), // vary to avoid duplicate flags
        cost: i < withCost ? "700" : "",
      });
    }
    return buildDatasetAuto(HEADERS, rows, { name: "t" }).dataset!;
  }

  it("is false at 79% coverage", () => {
    expect(build(79).hasCostData).toBe(false);
  });
  it("is true at 81% coverage", () => {
    expect(build(81).hasCostData).toBe(true);
  });
});

describe("dataset-level blocking errors (§12.2)", () => {
  it("blocks when a required column is unmapped", () => {
    const rows: RawRow[] = [{ date: "2025-08-01", product: "A", quantity: "2", notes: "x y z" }];
    const { dataset, errors } = buildDatasetAuto(["date", "product", "quantity", "notes"], rows, { name: "t" });
    expect(dataset).toBeNull();
    expect(errors.join(" ")).toMatch(/Revenue/i);
  });

  it("blocks when no valid row survives", () => {
    const rows: RawRow[] = [
      { date: "nope", product: "A", quantity: "2", revenue: "500", cost: "300" },
      { date: "also-bad", product: "B", quantity: "1", revenue: "700", cost: "400" },
    ];
    const { dataset, errors } = buildDatasetAuto(HEADERS, rows, { name: "t" });
    expect(dataset).toBeNull();
    expect(errors.join(" ")).toMatch(/could be read/i);
  });
});
