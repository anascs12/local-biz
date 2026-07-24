/**
 * File-level validation — SPEC §12.1 (block on failure).
 * Runs before parsing: extension allowlist, size ≤ 10 MB. Row bounds (≥1,
 * ≤100,000) are checked after the file is parsed into rows.
 */

import { FILE_ERRORS } from "./messages";

export const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ROWS = 100_000;

export interface FileMeta {
  name: string;
  size: number;
}

export interface ValidationOutcome {
  ok: boolean;
  error?: string;
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

/** §12.1 — extension + size checks (pre-parse). */
export function validateFile(file: FileMeta): ValidationOutcome {
  const ext = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return { ok: false, error: FILE_ERRORS.unsupportedType() };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: FILE_ERRORS.tooLarge(file.size / (1024 * 1024)) };
  }
  return { ok: true };
}

/** §12.1 — row-count bounds (post-parse). */
export function validateRowBounds(dataRowCount: number): ValidationOutcome {
  if (dataRowCount < 1) return { ok: false, error: FILE_ERRORS.empty() };
  if (dataRowCount > MAX_ROWS) return { ok: false, error: FILE_ERRORS.tooManyRows(dataRowCount) };
  return { ok: true };
}
