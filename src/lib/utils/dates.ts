/**
 * Date helpers for the analytics layer.
 *
 * All arithmetic goes through local calendar components rather than raw
 * millisecond maths so DST transitions cannot shift a bucket boundary.
 */

export const MS_DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** ISO weeks start Monday (§13.4). */
export function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0 Sun … 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(x, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive day count between two dates (1 when start === end). */
export function daysInclusive(start: Date, end: Date): number {
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  return Math.round((b - a) / MS_DAY) + 1;
}

export function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
