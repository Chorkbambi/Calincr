import { CALENDAR, COMBAT, type ExerciseId } from './config';
import { daysInMonth, monthKey, startOfWeek, weekdayMondayFirst, type DayKey } from './dates';
import { getExercise } from './exercises';
import type { SetRecord } from './sets';

export type ExerciseTotals = Partial<Record<ExerciseId, number>>;

/** Comparable effort of a set: reps, or seconds / secondsPerHit for timed exercises. */
export function setVolume(set: Pick<SetRecord, 'exerciseId' | 'amount'>): number {
  return getExercise(set.exerciseId).unit === 'seconds' ? set.amount / COMBAT.secondsPerHit : set.amount;
}

/** 0 (rest) to 4 (heavy day). */
export function intensityLevel(volume: number): number {
  let level = 0;
  CALENDAR.intensityThresholds.forEach((threshold, i) => {
    if (volume >= threshold) level = i + 1;
  });
  return level;
}

export function totalsByExercise(sets: readonly SetRecord[]): ExerciseTotals {
  const totals: ExerciseTotals = {};
  for (const set of sets) totals[set.exerciseId] = (totals[set.exerciseId] ?? 0) + set.amount;
  return totals;
}

export interface DaySummary {
  day: DayKey;
  volume: number;
  intensity: number;
  sets: SetRecord[];
}

export function summarizeByDay(sets: readonly SetRecord[]): Map<DayKey, DaySummary> {
  const days = new Map<DayKey, DaySummary>();
  for (const set of sets) {
    const summary = days.get(set.day) ?? { day: set.day, volume: 0, intensity: 0, sets: [] };
    summary.sets.push(set);
    summary.volume += setVolume(set);
    summary.intensity = intensityLevel(summary.volume);
    days.set(set.day, summary);
  }
  for (const summary of days.values()) summary.sets.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return days;
}

/** Totals per exercise for each week (key = Monday), sorted chronologically. */
export function totalsByWeek(sets: readonly SetRecord[]): { weekStart: DayKey; totals: ExerciseTotals }[] {
  return groupTotals(sets, (s) => startOfWeek(s.day)).map(([weekStart, totals]) => ({ weekStart, totals }));
}

/** Totals per exercise for each month (key = YYYY-MM), sorted chronologically. */
export function totalsByMonth(sets: readonly SetRecord[]): { month: string; totals: ExerciseTotals }[] {
  return groupTotals(sets, (s) => monthKey(s.day)).map(([month, totals]) => ({ month, totals }));
}

function groupTotals(sets: readonly SetRecord[], keyOf: (s: SetRecord) => string): [string, ExerciseTotals][] {
  const groups = new Map<string, SetRecord[]>();
  for (const set of sets) {
    const key = keyOf(set);
    groups.set(key, [...(groups.get(key) ?? []), set]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => [key, totalsByExercise(group)]);
}

/** Month grid, Monday-first weeks; null cells are outside the month. `month` is 1-12. */
export function monthGrid(year: number, month: number): (DayKey | null)[][] {
  const count = daysInMonth(year, month);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const cells: (DayKey | null)[] = Array.from({ length: weekdayMondayFirst(first) }, () => null);
  for (let d = 1; d <= count; d++) cells.push(`${first.slice(0, 8)}${String(d).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DayKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
