import type { ExerciseId, MuscleId } from './config';
import type { DayKey } from './dates';
import type { WorkOutcome } from './engine';

/** One logged series of an exercise. */
export interface SetRecord {
  id: string;
  /** ISO date-time of the first rep. */
  startedAt: string;
  updatedAt: string;
  day: DayKey;
  exerciseId: ExerciseId;
  /** Reps, or seconds for timed exercises. */
  amount: number;
  xpByMuscle: Partial<Record<MuscleId, number>>;
  multiplierByMuscle: Partial<Record<MuscleId, number>>;
  damage: number;
  hits: number;
}

/** True when `outcome` can extend `set` (same exercise, same day). */
export function canExtendSet(set: SetRecord | null, outcome: WorkOutcome): set is SetRecord {
  return set !== null && set.exerciseId === outcome.exerciseId && set.day === outcome.day;
}

/**
 * Adds the outcome of some work to the open set, or starts a new set
 * when there is none or it belongs to another exercise/day.
 */
export function recordWork(set: SetRecord | null, outcome: WorkOutcome, now: Date, newId: () => string): SetRecord {
  const damage = outcome.hits.reduce((sum, h) => sum + h.damage, 0);
  const at = now.toISOString();
  if (!canExtendSet(set, outcome)) {
    return {
      id: newId(),
      startedAt: at,
      updatedAt: at,
      day: outcome.day,
      exerciseId: outcome.exerciseId,
      amount: outcome.amount,
      xpByMuscle: { ...outcome.xpByMuscle },
      multiplierByMuscle: { ...outcome.multiplierByMuscle },
      damage,
      hits: outcome.hits.length,
    };
  }
  const xpByMuscle = { ...set.xpByMuscle };
  for (const [muscle, xp] of Object.entries(outcome.xpByMuscle) as [MuscleId, number][]) {
    xpByMuscle[muscle] = (xpByMuscle[muscle] ?? 0) + xp;
  }
  return {
    ...set,
    updatedAt: at,
    amount: set.amount + outcome.amount,
    xpByMuscle,
    multiplierByMuscle: { ...outcome.multiplierByMuscle, ...set.multiplierByMuscle },
    damage: set.damage + damage,
    hits: set.hits + outcome.hits.length,
  };
}
