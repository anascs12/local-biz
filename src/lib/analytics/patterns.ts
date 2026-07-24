/**
 * Day-of-week analysis and period extremes — SPEC §13.8.
 *
 * "Group by weekday, compute mean revenue per occurring day (not total, which
 * would bias toward weekdays that appear more often in the range)."
 *
 * `occurrences` counts CALENDAR occurrences of that weekday inside the window —
 * not just days that happened to have a sale. That is the bias the SPEC is
 * guarding against, and it means a zero-sale Monday correctly drags the Monday
 * mean down.
 *
 *   Weekend Uplift % = ((avgRevenue(Sat,Sun) − avgRevenue(Mon–Fri)) / avgRevenue(Mon–Fri)) × 100
 *
 * Reported only when the range covers ≥3 weekends.
 */

import type { Transaction } from "@/types/transaction";
import type { DateWindow, DayOfWeekStat, Patterns, TimeSeries } from "@/types/analytics";
import { DAY_LABELS, addDays, startOfDay } from "@/lib/utils/dates";

export const MIN_WEEKENDS_FOR_UPLIFT = 3;

/** Calendar occurrences of each weekday within the window. */
export function weekdayOccurrences(window: DateWindow): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let cursor = startOfDay(window.start);
  const endMs = startOfDay(window.end).getTime();
  for (let i = 0; i < 20_000 && cursor.getTime() <= endMs; i++) {
    counts[cursor.getDay()] += 1;
    cursor = addDays(cursor, 1);
  }
  return counts;
}

export function computePatterns(
  txns: Transaction[],
  window: DateWindow,
  timeSeries: TimeSeries,
): Patterns {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const t of txns) totals[t.date.getDay()] += t.revenue;

  const occurrences = weekdayOccurrences(window);
  const dayOfWeek: DayOfWeekStat[] = totals.map((total, day) => ({
    day,
    label: DAY_LABELS[day],
    totalRevenue: total,
    occurrences: occurrences[day],
    meanRevenue: occurrences[day] > 0 ? total / occurrences[day] : 0,
  }));

  const meanOf = (days: number[]) => {
    const revenue = days.reduce((s, d) => s + totals[d], 0);
    const count = days.reduce((s, d) => s + occurrences[d], 0);
    return count > 0 ? revenue / count : null;
  };

  const weekendCount = Math.min(occurrences[0], occurrences[6]);
  const weekendMean = meanOf([0, 6]);
  const weekdayMean = meanOf([1, 2, 3, 4, 5]);
  const weekendUpliftPct =
    weekendCount >= MIN_WEEKENDS_FOR_UPLIFT &&
    weekendMean !== null &&
    weekdayMean !== null &&
    weekdayMean > 0
      ? ((weekendMean - weekdayMean) / weekdayMean) * 100
      : null;

  // Best/worst weekday by mean revenue, considering only weekdays that occur.
  const occurring = dayOfWeek.filter((d) => d.occurrences > 0);
  const sortedDays = [...occurring].sort((a, b) => b.meanRevenue - a.meanRevenue);
  const bestDayOfWeek = sortedDays.length > 0 ? sortedDays[0].label : null;
  const worstDayOfWeek = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].label : null;

  // Best/worst period from the bucketed series (empty buckets are real data).
  const points = timeSeries.points;
  let bestPeriod: Patterns["bestPeriod"] = null;
  let worstPeriod: Patterns["worstPeriod"] = null;
  if (points.length > 0) {
    let best = points[0];
    let worst = points[0];
    for (const p of points) {
      if (p.revenue > best.revenue) best = p;
      if (p.revenue < worst.revenue) worst = p;
    }
    bestPeriod = { period: best.period, revenue: best.revenue };
    worstPeriod = { period: worst.period, revenue: worst.revenue };
  }

  return {
    dayOfWeek,
    weekendUpliftPct,
    bestDayOfWeek,
    worstDayOfWeek,
    bestPeriod,
    worstPeriod,
  };
}
