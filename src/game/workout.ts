import { QUEST, WORKOUT, type ExerciseId } from './config';
import { getExercise } from './exercises';
import type { DailyQuest } from './quest';
import { splitForExercise } from './quest';

/** What the player picks before an exercise: N sets of M reps (or seconds), with a rest between sets. */
export interface WorkoutPlan {
  sets: number;
  /** Target of each set: reps, or seconds for holds. */
  perSet: number;
  /** Rest between sets in seconds (0 = the next set starts right away). */
  restSeconds: number;
}

/** An exercise in progress, set after set. */
export interface Workout {
  exerciseId: ExerciseId;
  plan: WorkoutPlan;
  /** Finished sets, then the set in progress while `phase` is 'work'. */
  amounts: number[];
  phase: 'work' | 'rest' | 'done';
  /** Start of the rest in progress (ms timestamp). */
  restStartedAt: number | null;
  /** Last time some work was counted in the current set (ms timestamp). */
  lastWorkAt: number | null;
}

/** 'setDone' = a set just ended and the rest started; 'done' = the last set just ended. */
export type WorkoutEvent = 'setDone' | 'done' | null;

/** Keeps a plan inside sensible limits. */
export function clampPlan(exerciseId: ExerciseId, plan: WorkoutPlan): WorkoutPlan {
  const unit = getExercise(exerciseId).unit;
  const int = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : min);
  return {
    sets: int(plan.sets, 1, WORKOUT.maxSets),
    perSet: int(plan.perSet, 1, WORKOUT.maxPerSet[unit]),
    restSeconds: int(plan.restSeconds, 0, 600),
  };
}

/** Last session of an exercise: total of the day, its best set and how many sets. */
export interface LastSession {
  total: number;
  best: number;
  sets: number;
}

/**
 * The plan offered before an exercise: the daily quest's sets when it is the quest's exercise,
 * else the same as last time, else a starting plan for the exercise's tier. The player can change it.
 */
export function suggestPlan(
  exerciseId: ExerciseId,
  quest: DailyQuest | null,
  last: LastSession | null,
  restSeconds: number,
): WorkoutPlan {
  const exercise = getExercise(exerciseId);
  const minPerSet = QUEST.minPerSet[exercise.tier][exercise.unit];
  let plan: { sets: number; perSet: number };
  if (quest && quest.exerciseId === exerciseId && !quest.completed) {
    plan = { sets: quest.sets, perSet: quest.perSet };
  } else if (last && last.total > 0 && last.best > 0) {
    // Leftover mini-sets don't count as sets: 15 + 15 + 1 is 2 × 15.
    const sets = Math.max(1, Math.min(last.sets, Math.round(last.total / last.best)));
    plan = { sets, perSet: Math.max(minPerSet, last.best) };
  } else {
    plan = splitForExercise(exerciseId, QUEST.startTarget[exercise.tier][exercise.unit]);
  }
  return clampPlan(exerciseId, { ...plan, restSeconds });
}

export function startWorkout(exerciseId: ExerciseId, plan: WorkoutPlan): Workout {
  return { exerciseId, plan: clampPlan(exerciseId, plan), amounts: [0], phase: 'work', restStartedAt: null, lastWorkAt: null };
}

/** Amount of the set in progress (0 while resting). */
export function currentSetAmount(workout: Workout): number {
  return workout.phase === 'work' ? (workout.amounts.at(-1) ?? 0) : 0;
}

/** Number (1-based) of the set in progress, or of the next set while resting. */
export function currentSetNumber(workout: Workout): number {
  return workout.phase === 'rest' ? workout.amounts.length + 1 : workout.amounts.length;
}

/** The set that ended last (1-based number and amount), null before the first one ends. */
export function lastFinishedSet(workout: Workout): { number: number; amount: number } | null {
  const index = workout.phase === 'work' ? workout.amounts.length - 2 : workout.amounts.length - 1;
  const amount = workout.amounts[index];
  return index >= 0 && amount !== undefined ? { number: index + 1, amount } : null;
}

/** Total of every set so far. */
export function workoutTotal(workout: Workout): number {
  return workout.amounts.reduce((sum, a) => sum + a, 0);
}

/** Ends the set in progress (target reached, player done, or nothing counted for a while). An empty set can't end. */
export function finishSet(workout: Workout, now: number): { workout: Workout; event: WorkoutEvent } {
  if (workout.phase !== 'work' || currentSetAmount(workout) <= 0) return { workout, event: null };
  if (workout.amounts.length >= workout.plan.sets) {
    return { workout: { ...workout, phase: 'done', lastWorkAt: null }, event: 'done' };
  }
  if (workout.plan.restSeconds <= 0) {
    return { workout: { ...workout, amounts: [...workout.amounts, 0], lastWorkAt: null }, event: 'setDone' };
  }
  return { workout: { ...workout, phase: 'rest', restStartedAt: now, lastWorkAt: null }, event: 'setDone' };
}

/** The rest is over (or skipped): the next set starts. */
export function endRest(workout: Workout): Workout {
  if (workout.phase !== 'rest') return workout;
  return { ...workout, phase: 'work', amounts: [...workout.amounts, 0], restStartedAt: null, lastWorkAt: null };
}

/**
 * Counts some work in the set in progress; the set ends by itself when its target is reached.
 * Work during the rest starts the next set early. Nothing is counted once the workout is done.
 */
export function addToWorkout(workout: Workout, amount: number, now: number): { workout: Workout; event: WorkoutEvent } {
  const n = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  if (n === 0 || workout.phase === 'done') return { workout, event: null };
  const working = endRest(workout);
  const amounts = [...working.amounts];
  amounts[amounts.length - 1] = (amounts.at(-1) ?? 0) + n;
  const next: Workout = { ...working, amounts, lastWorkAt: now };
  return (amounts.at(-1) ?? 0) >= next.plan.perSet ? finishSet(next, now) : { workout: next, event: null };
}

/** Seconds of rest left (0 when not resting or when the rest is over). */
export function restSecondsLeft(workout: Workout, now: number): number {
  if (workout.phase !== 'rest' || workout.restStartedAt === null) return 0;
  return Math.max(0, workout.plan.restSeconds - Math.floor(Math.max(0, now - workout.restStartedAt) / 1000));
}

/** True when a started set has seen no work for WORKOUT.idleEndSeconds (the player stopped before the target). */
export function isSetIdle(workout: Workout, now: number): boolean {
  return (
    workout.phase === 'work' &&
    currentSetAmount(workout) > 0 &&
    workout.lastWorkAt !== null &&
    now - workout.lastWorkAt >= WORKOUT.idleEndSeconds * 1000
  );
}

/** Stops the workout where it is: the sets that have something in them. */
export function stopWorkout(workout: Workout): { workout: Workout; amounts: number[] } {
  return { workout: { ...workout, phase: 'done', restStartedAt: null, lastWorkAt: null }, amounts: workout.amounts.filter((a) => a > 0) };
}

/** Corrected amount of a set on the review screen: never below 0 nor above the set limit. */
export function adjustSetAmount(exerciseId: ExerciseId, amount: number, delta: number): number {
  const unit = getExercise(exerciseId).unit;
  return Math.min(WORKOUT.maxPerSet[unit] * 2, Math.max(0, Math.floor(amount) + delta));
}
