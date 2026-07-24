import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { validateFile, validateRowBounds, fileExtension } from "@/lib/validation/fileValidation";
import { assembleDataset } from "@/lib/validation/datasetValidation";
import { detectColumns, type RawRow } from "@/lib/parsing/columnMapper";
import { SchemaReference } from "./SchemaReference";
import { ValidationReport } from "./ValidationReport";

// SPEC §9.2 / §12.1 / §11.2 / §10.4

describe("file validation messages (§12.1 / §24)", () => {
  it("rejects unsupported extensions with a plain-language message", () => {
    const r = validateFile({ name: "notes.txt", size: 100 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("isn't supported");
    expect(r.error).toContain(".csv");
  });

  it("rejects oversized files and names the actual size", () => {
    const r = validateFile({ name: "big.csv", size: 14.2 * 1024 * 1024 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/14\.2 MB/);
    expect(r.error).toContain("maximum is 10 MB");
  });

  it("accepts csv, xlsx and xls", () => {
    for (const name of ["a.csv", "a.xlsx", "a.xls", "A.CSV"]) {
      expect(validateFile({ name, size: 1000 }).ok).toBe(true);
    }
    expect(fileExtension("Sales Export.xlsx")).toBe(".xlsx");
  });

  it("enforces row bounds", () => {
    expect(validateRowBounds(0).error).toContain("empty");
    expect(validateRowBounds(142_000).error).toMatch(/142,000 rows/);
    expect(validateRowBounds(500).ok).toBe(true);
  });
});

describe("date order override (§11.2)", () => {
  const headers = ["date", "product", "quantity", "revenue"];
  // Ambiguous: no component exceeds 12, so DD/MM is assumed by default.
  const rows: RawRow[] = [
    { date: "05/06/2025", product: "A", quantity: "1", revenue: "100" },
    { date: "07/08/2025", product: "B", quantity: "1", revenue: "200" },
  ];
  const mapping = detectColumns(headers, rows).mapping;

  it("flags ambiguity and defaults to day/month/year", () => {
    const r = assembleDataset(rows, mapping, { name: "t" });
    expect(r.meta?.dateFormatAmbiguous).toBe(true);
    expect(r.meta?.dayFirst).toBe(true);
    // 05/06 read as 5 June
    expect(r.dataset!.transactions[0].date.getMonth()).toBe(5);
    expect(r.dataset!.transactions[0].date.getDate()).toBe(5);
  });

  it("re-reads the dates when the user switches to month/day/year", () => {
    const r = assembleDataset(rows, mapping, { name: "t", dayFirst: false });
    expect(r.meta?.dayFirst).toBe(false);
    // 05/06 now read as 6 May
    expect(r.dataset!.transactions[0].date.getMonth()).toBe(4);
    expect(r.dataset!.transactions[0].date.getDate()).toBe(6);
  });
});

describe("duplicate handling (§10.4)", () => {
  const headers = ["date", "product", "quantity", "revenue", "cost"];
  const dup: RawRow = { date: "2025-08-01", product: "Shirt", quantity: "2", revenue: "4800", cost: "3900" };
  const rows = [dup, { ...dup }, { date: "2025-08-02", product: "Cap", quantity: "1", revenue: "800", cost: "600" }];
  const mapping = detectColumns(headers, rows).mapping;

  it("keeps duplicates by default and reports the count", () => {
    const r = assembleDataset(rows, mapping, { name: "t" });
    expect(r.dataset!.validRowCount).toBe(3);
    expect(r.meta?.duplicateCount).toBe(1);
  });

  it("removes them only when the user opts in", () => {
    const r = assembleDataset(rows, mapping, { name: "t", removeDuplicates: true });
    expect(r.dataset!.validRowCount).toBe(2);
  });
});

describe("upload UI rendering (§9.2)", () => {
  it("format guide lists every field with its accepted column names", () => {
    const html = renderToStaticMarkup(<SchemaReference />);
    expect(html).toContain("Revenue");
    expect(html).toContain("order_date"); // an alias the mapper really matches
    expect(html).toContain("Required");
    expect(html).toContain("Optional");
    expect(html).toContain("Blue Denim Shirt"); // §10.1 example row
  });

  it("validation report explains a missing cost column without inventing profit (§12.5)", () => {
    const headers = ["date", "product", "quantity", "revenue"];
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "A", quantity: "1", revenue: "100" },
      { date: "2025-08-02", product: "B", quantity: "1", revenue: "200" },
    ];
    const mapping = detectColumns(headers, rows).mapping;
    const r = assembleDataset(rows, mapping, { name: "no-cost.csv" });

    const html = renderToStaticMarkup(
      <ValidationReport
        dataset={r.dataset!}
        totalRows={rows.length}
        duplicateCount={0}
        removeDuplicates={false}
        onToggleDuplicates={() => {}}
        onContinue={() => {}}
        onBack={() => {}}
      />,
    );
    expect(html).toContain("Profit analysis won");
    expect(html).toContain("never estimate");
    expect(html).toContain("Continue to dashboard");
    expect(html).not.toContain("NaN");
  });

  it("validation report surfaces skipped rows and grouped issues", () => {
    const headers = ["date", "product", "quantity", "revenue", "cost"];
    const rows: RawRow[] = [
      { date: "2025-08-01", product: "A", quantity: "1", revenue: "100", cost: "60" },
      { date: "bad-date", product: "B", quantity: "1", revenue: "200", cost: "120" },
      { date: "2025-08-03", product: "", quantity: "1", revenue: "200", cost: "120" },
    ];
    const mapping = detectColumns(headers, rows).mapping;
    const r = assembleDataset(rows, mapping, { name: "messy.csv" });

    const html = renderToStaticMarkup(
      <ValidationReport
        dataset={r.dataset!}
        totalRows={rows.length}
        duplicateCount={0}
        removeDuplicates={false}
        onToggleDuplicates={() => {}}
        onContinue={() => {}}
        onBack={() => {}}
      />,
    );
    expect(html).toContain("date we couldn");   // grouped message
    expect(html).toContain("no product name");
    expect(html).toContain("Skipped");
  });
});
