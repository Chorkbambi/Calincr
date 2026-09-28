import { EXERCISES, type ExerciseConfig, type ExerciseId, type MuscleId } from './config';

export function getExercise(id: ExerciseId): ExerciseConfig {
  const exercise = EXERCISES.find((e) => e.id === id);
  if (!exercise) throw new Error(`Unknown exercise: ${id}`);
  return exercise;
}

export function isExerciseId(id: string): id is ExerciseId {
  return EXERCISES.some((e) => e.id === id);
}

/** Muscles actually worked by an exercise, with their share of the XP. */
export function muscleWeights(exercise: ExerciseConfig): [MuscleId, number][] {
  return (Object.entries(exercise.muscles) as [MuscleId, number][]).filter(([, w]) => w > 0);
}

/**
 * Splits the XP of `units` reps (or seconds) across muscles, before rest multipliers.
 */
export function splitXp(exercise: ExerciseConfig, units: number): Partial<Record<MuscleId, number>> {
  const result: Partial<Record<MuscleId, number>> = {};
  for (const [muscle, weight] of muscleWeights(exercise)) {
    result[muscle] = exercise.baseXp * units * weight;
  }
  return result;
}
