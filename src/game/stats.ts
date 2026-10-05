import { CALENDAR, COMBAT, type ExerciseId } from './config';
import { addDays, daysInMonth, monthKey, startOfWeek, weekdayMondayFirst, type DayKey } from './dates';
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

export interface WeekProgress {
  weekStart: DayKey;
  /** Total reps (or seconds) of the exercise that week. */
  volume: number;
  /** Best single set that week (0 = not trained). */
  best: number;
}

/** The last `weeks` weeks (oldest first, empty weeks included) of one exercise, from its per-day totals. */
export function weeklyProgress(
  days: readonly { day: DayKey; total: number; best: number }[],
  today: DayKey,
  weeks: number,
): WeekProgress[] {
  const last = startOfWeek(today);
  const result: WeekProgress[] = [];
  for (let i = weeks - 1; i >= 0; i--) result.push({ weekStart: addDays(last, -7 * i), volume: 0, best: 0 });
  const byWeek = new Map(result.map((w) => [w.weekStart, w]));
  for (const d of days) {
    const week = byWeek.get(startOfWeek(d.day));
    if (!week) continue;
    week.volume += d.total;
    week.best = Math.max(week.best, d.best);
  }
  return result;
}

export interface MonthSummary {
  month: string;
  activeDays: number;
  sets: number;
  reps: number;
  holdSeconds: number;
  /** Exercise with the most volume this month. */
  topExercise: ExerciseId | null;
  /** Best sessions (day totals of an exercise) of the month that beat every session before the month. */
  records: { exerciseId: ExerciseId; previous: number; best: number }[];
}

/** Summary of one month (`YYYY-MM`). `sets` may include earlier months: they set the records to beat. */
export function monthSummary(sets: readonly SetRecord[], month: string): MonthSummary {
  const before = new Map<ExerciseId, number>();
  const bestInMonth = new Map<ExerciseId, number>();
  const sessions = new Map<string, { exerciseId: ExerciseId; total: number; inMonth: boolean }>();
  const days = new Set<DayKey>();
  const volume = new Map<ExerciseId, number>();
  let count = 0;
  let reps = 0;
  let holdSeconds = 0;
  for (const set of sets) {
    const key = monthKey(set.day);
    if (key > month || set.amount <= 0) continue;
    const session = sessions.get(`${set.day}|${set.exerciseId}`) ?? { exerciseId: set.exerciseId, total: 0, inMonth: key === month };
    session.total += set.amount;
    sessions.set(`${set.day}|${set.exerciseId}`, session);
    if (key !== month) continue;
    count += 1;
    days.add(set.day);
    if (getExercise(set.exerciseId).unit === 'seconds') holdSeconds += set.amount;
    else reps += set.amount;
    volume.set(set.exerciseId, (volume.get(set.exerciseId) ?? 0) + setVolume(set));
  }
  for (const { exerciseId, total, inMonth } of sessions.values()) {
    const map = inMonth ? bestInMonth : before;
    map.set(exerciseId, Math.max(map.get(exerciseId) ?? 0, total));
  }
  const records = [...bestInMonth.entries()]
    .filter(([id, best]) => (before.get(id) ?? 0) > 0 && best > before.get(id)!)
    .map(([exerciseId, best]) => ({ exerciseId, previous: before.get(exerciseId)!, best }))
    .sort((a, b) => b.best / b.previous - a.best / a.previous);
  const top = [...volume.entries()].sort((a, b) => b[1] - a[1])[0];
  return { month, activeDays: days.size, sets: count, reps, holdSeconds, topExercise: top ? top[0] : null, records };
}

/** Best-set trend over the shown weeks: first and last trained weeks (null with fewer than 2 trained weeks). */
export function bestSetTrend(weeks: readonly WeekProgress[]): { first: number; last: number; change: number } | null {
  const trained = weeks.filter((w) => w.best > 0);
  if (trained.length < 2) return null;
  const first = trained[0]!.best;
  const last = trained[trained.length - 1]!.best;
  return { first, last, change: (last - first) / first };
}
