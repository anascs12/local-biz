/**
 * Excel parsing — SPEC §11 step 2 / §21.1 (SheetJS) / §25.
 *
 * SheetJS is the largest dependency, so it is loaded via dynamic import() and
 * only when an Excel file is actually chosen (§25). `cellDates: true` converts
 * Excel serial dates to JS Date objects, which the date parser handles directly.
 */

import type { RawRow } from "./columnMapper";
import type { ParsedTable } from "./csv";

export async function parseExcelBuffer(data: ArrayBuffer | Uint8Array): Promise<ParsedTable> {
  const XLSX = await import("xlsx");
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const wb = XLSX.read(bytes, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  if (aoa.length === 0) return { headers: [], rows: [] };

  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? "").trim());
  const rows: RawRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const arr = aoa[i] as unknown[];
    const row: RawRow = {};
    let hasValue = false;
    headers.forEach((h, j) => {
      if (h === "") return;
      const v = arr[j];
      row[h] = v;
      if (v !== null && v !== undefined && String(v).trim() !== "") hasValue = true;
    });
    if (hasValue) rows.push(row);
  }
  return { headers: headers.filter((h) => h !== ""), rows };
}

/** Browser entry: read an Excel File to a ParsedTable. */
export async function parseExcelFile(file: File): Promise<ParsedTable> {
  const buf = await file.arrayBuffer();
  return parseExcelBuffer(buf);
}
