import { EXERCISES, MUSCLE_IDS, type ExerciseId, type MuscleId } from './config';
import { addDays, type DayKey } from './dates';
import type { Kill } from './engine';
import { getExercise } from './exercises';
import type { SetRecord } from './sets';
import { setVolume } from './stats';

export interface WeeklyRecap {
  weekStart: DayKey;
  activeDays: number;
  reps: number;
  holdSeconds: number;
  kills: number;
  bosses: number;
  topExercise: { exerciseId: ExerciseId; amount: number } | null;
  topMuscle: MuscleId | null;
}

/** Summary of the week starting on `weekStart` (Monday). Kills are matched with `dayOf` (local day of an ISO date). */
export function weeklyRecap(
  weekStart: DayKey,
  sets: readonly SetRecord[],
  kills: readonly Kill[],
  dayOf: (iso: string) => DayKey,
): WeeklyRecap {
  const end = addDays(weekStart, 6);
  const inWeek = (day: DayKey) => day >= weekStart && day <= end;
  const weekSets = sets.filter((s) => inWeek(s.day));
  const weekKills = kills.filter((k) => inWeek(dayOf(k.defeatedAt)));

  const byExercise = new Map<ExerciseId, number>();
  const xpByMuscle = new Map<MuscleId, number>();
  let reps = 0;
  let holdSeconds = 0;
  for (const set of weekSets) {
    if (getExercise(set.exerciseId).unit === 'seconds') holdSeconds += set.amount;
    else reps += set.amount;
    byExercise.set(set.exerciseId, (byExercise.get(set.exerciseId) ?? 0) + set.amount);
    for (const m of MUSCLE_IDS) xpByMuscle.set(m, (xpByMuscle.get(m) ?? 0) + (set.xpByMuscle[m] ?? 0));
  }
  // Ranked by effort (holds count seconds / secondsPerHit), shown with their real amount.
  const top = EXERCISES.map((e) => ({ exerciseId: e.id as ExerciseId, amount: byExercise.get(e.id) ?? 0 }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => setVolume(b) - setVolume(a))[0];
  const topMuscle = MUSCLE_IDS.filter((m) => (xpByMuscle.get(m) ?? 0) > 0).sort(
    (a, b) => (xpByMuscle.get(b) ?? 0) - (xpByMuscle.get(a) ?? 0),
  )[0];

  return {
    weekStart,
    activeDays: new Set(weekSets.map((s) => s.day)).size,
    reps,
    holdSeconds,
    kills: weekKills.length,
    bosses: weekKills.filter((k) => k.boss).length,
    topExercise: top ?? null,
    topMuscle: topMuscle ?? null,
  };
}
