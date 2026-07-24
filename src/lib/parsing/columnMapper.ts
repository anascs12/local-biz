/**
 * Column detection — SPEC §11.1.
 *
 * For each internal field, score every file header and take the best match above
 * threshold:
 *   1. Exact match on normalized header vs alias list → 1.0
 *   2. Contains match (header contains an alias or vice versa) → 0.85
 *   3. Levenshtein distance ≤ 2 against any alias → 0.7
 *   4. Value-type inference as a tiebreaker (dates / numeric magnitude).
 *
 * A header is assigned to at most one field; assignment is greedy by descending
 * confidence. Anything below 0.6 is left unmapped for the user to set manually.
 * Confidence < 0.8 is surfaced as "Please confirm" in the UI.
 */

import {
  FIELD_SPECS,
  type FieldSpec,
  type InternalField,
  normalizeHeader,
} from "./schema";
import { parseNumber } from "./numberParser";
import { detectDateFormat } from "./dateParser";

export type RawRow = Record<string, unknown>;
export type ColumnMapping = Record<InternalField, string | null>;
export type MappingConfidence = Record<InternalField, number>;

export interface ColumnDetectionResult {
  mapping: ColumnMapping;
  confidence: MappingConfidence;
  headers: string[];
}

/** Levenshtein distance with an early exit once it exceeds `max`. */
export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

interface ColumnProfile {
  isAllNumeric: boolean;
  isAllDates: boolean;
  numericMean: number;
}

function sample(rows: RawRow[], header: string, n: number): string[] {
  const out: string[] = [];
  for (const r of rows) {
    const v = r[header];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      out.push(String(v));
      if (out.length >= n) break;
    }
  }
  return out;
}

/** First `n` non-empty values of a column — for the mapping-review preview (§9.2). */
export function previewValues(rows: RawRow[], header: string, n = 3): string[] {
  return sample(rows, header, n);
}

function profileColumn(rows: RawRow[], header: string): ColumnProfile {
  const values = sample(rows, header, 20);
  if (values.length === 0) {
    return { isAllNumeric: false, isAllDates: false, numericMean: 0 };
  }
  const nums = values.map(parseNumber);
  const isAllNumeric = nums.every((n) => n !== null);
  const numericMean = isAllNumeric
    ? (nums as number[]).reduce((a, b) => a + b, 0) / nums.length
    : 0;
  const dateInfo = detectDateFormat(values);
  const isAllDates = !!dateInfo && dateInfo.confidence >= 0.9 && !isAllNumeric;
  return { isAllNumeric, isAllDates, numericMean };
}

/** Alias-based score (steps 1–3 of §11.1). */
function aliasScore(spec: FieldSpec, header: string): number {
  const nh = normalizeHeader(header);
  const aliases = spec.aliases.map(normalizeHeader);
  if (aliases.includes(nh)) return 1.0;
  for (const a of aliases) {
    if (nh.includes(a) || a.includes(nh)) return 0.85;
  }
  for (const a of aliases) {
    if (levenshtein(nh, a, 2) <= 2) return 0.7;
  }
  return 0;
}

/** Value-type inference (step 4 of §11.1) applied as a tiebreaker/adjustment. */
function withValueType(spec: FieldSpec, base: number, p: ColumnProfile): number {
  let score = base;
  if (spec.kind === "date") {
    if (p.isAllDates) score = Math.min(1, Math.max(score, 0.7) + (base > 0 ? 0.05 : 0));
    else if (base > 0) score -= 0.15; // alias says date, values aren't
  } else if (spec.kind === "number") {
    if (p.isAllNumeric) {
      if (base > 0) score = Math.min(1, score + 0.03);
      // magnitude tiebreak: quantity columns have a much lower mean
      if (spec.field === "quantity" && p.numericMean > 0 && p.numericMean < 50) score += 0.02;
      if ((spec.field === "revenue" || spec.field === "cost") && p.numericMean >= 50) score += 0.02;
    } else if (base > 0) {
      score -= 0.3; // numeric field, but the column is not numeric
    }
  } else {
    // string field mapped onto an all-numeric column is unlikely (except order_id)
    if (p.isAllNumeric && base > 0 && spec.field !== "order_id") score -= 0.05;
  }
  return Math.max(0, Math.min(1, score));
}

interface Candidate {
  field: InternalField;
  header: string;
  score: number;
}

const MIN_CONFIDENCE = 0.6; // §11.1 — below this, left unmapped

export function detectColumns(headers: string[], rows: RawRow[]): ColumnDetectionResult {
  const profiles = new Map<string, ColumnProfile>();
  for (const h of headers) profiles.set(h, profileColumn(rows, h));

  const candidates: Candidate[] = [];
  for (const spec of FIELD_SPECS) {
    for (const header of headers) {
      const base = aliasScore(spec, header);
      const p = profiles.get(header)!;
      // Value inference can promote an all-dates column to the Date field even
      // with no alias match; otherwise a zero alias score stays unmapped.
      const score =
        base > 0 || (spec.kind === "date" && p.isAllDates)
          ? withValueType(spec, base, p)
          : 0;
      if (score > 0) candidates.push({ field: spec.field, header, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const mapping = Object.fromEntries(FIELD_SPECS.map((s) => [s.field, null])) as ColumnMapping;
  const confidence = Object.fromEntries(FIELD_SPECS.map((s) => [s.field, 0])) as MappingConfidence;
  const usedHeaders = new Set<string>();

  for (const c of candidates) {
    if (c.score < MIN_CONFIDENCE) continue;
    if (mapping[c.field] !== null || usedHeaders.has(c.header)) continue;
    mapping[c.field] = c.header;
    confidence[c.field] = c.score;
    usedHeaders.add(c.header);
  }

  return { mapping, confidence, headers };
}
