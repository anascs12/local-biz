/**
 * CSV parsing — SPEC §11 step 2 / §21.1 (PapaParse).
 *
 * PapaParse handles quoted fields with commas, UTF-8 BOM, and encoding issues
 * that hand-rolled parsing does not (§21.1). We keep values as strings and do
 * our own number/date coercion downstream.
 */

import Papa from "papaparse";
import type { RawRow } from "./columnMapper";

export interface ParsedTable {
  headers: string[];
  rows: RawRow[];
}

export function parseCsvString(text: string): ParsedTable {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: "greedy", // drops trailing/blank rows (§26)
    transformHeader: (h) => h.trim(),
    dynamicTyping: false,
  });
  const headers = (result.meta.fields ?? []).map((h) => h.trim()).filter((h) => h !== "");
  const rows = (result.data ?? []).filter((r) => r && typeof r === "object");
  return { headers, rows };
}

/** Browser entry: read a CSV File to a ParsedTable. */
export async function parseCsvFile(file: File): Promise<ParsedTable> {
  const text = await file.text();
  return parseCsvString(text);
}
