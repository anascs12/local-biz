import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelBuffer } from "./excel";
import { buildDatasetAuto } from "./pipeline";

// SPEC §26 — XLSX parses; Excel serial dates convert correctly
describe("parseExcelBuffer", () => {
  it("reads headers + rows and converts Excel dates through the pipeline", async () => {
    const ws = XLSX.utils.aoa_to_sheet(
      [
        ["order_date", "product_name", "quantity", "revenue", "cost"],
        [new Date(2025, 7, 1), "Blue Shirt", 2, 4800, 3900],
        [new Date(2025, 7, 2), "Silk Dupatta", 1, 4500, 2160],
        [new Date(2025, 7, 3), "Cotton Cap", 3, 2550, 1800],
      ],
      { cellDates: true },
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const table = await parseExcelBuffer(new Uint8Array(buf));
    expect(table.headers).toEqual(["order_date", "product_name", "quantity", "revenue", "cost"]);
    expect(table.rows).toHaveLength(3);

    const { dataset } = buildDatasetAuto(table.headers, table.rows, { name: "excel-test" });
    expect(dataset).not.toBeNull();
    expect(dataset!.validRowCount).toBe(3);
    expect(dataset!.hasCostData).toBe(true);
    const first = dataset!.transactions[0];
    expect(first.date.getFullYear()).toBe(2025);
    expect(first.date.getMonth()).toBe(7); // August
  });
});
