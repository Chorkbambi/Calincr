import { type Difficulty, type ExerciseConfig, type ExerciseId, type MuscleId } from './config';
import type { DayKey } from './dates';
import type { GameState } from './engine';
import { exercisesForDifficulty, muscleWeights } from './exercises';
import { currentMultiplier } from './recovery';

export interface ExerciseRecommendation {
  exerciseId: ExerciseId;
  /** Weighted average of the muscles' rest multipliers: 1.2 = +20 % XP compared to a normal day. */
  effectiveMultiplier: number;
  /** XP per rep (per second for timed exercises) once multipliers are applied. */
  xpPerUnit: number;
  /** Rest multiplier of each worked muscle, strongest share first. */
  muscles: { muscle: MuscleId; weight: number; multiplier: number }[];
}

export function evaluateExercise(state: GameState, exercise: ExerciseConfig, today: DayKey): ExerciseRecommendation {
  const muscles = muscleWeights(exercise)
    .map(([muscle, weight]) => ({ muscle, weight, multiplier: currentMultiplier(state.muscles[muscle], today) }))
    .sort((a, b) => b.weight - a.weight);
  // Rounded so float noise (0.8 × 1.5 + 0.2 × 1.5) does not break ties.
  const effectiveMultiplier = Math.round(muscles.reduce((sum, m) => sum + m.weight * m.multiplier, 0) * 10_000) / 10_000;
  return {
    exerciseId: exercise.id as ExerciseId,
    effectiveMultiplier,
    xpPerUnit: exercise.baseXp * effectiveMultiplier,
    muscles,
  };
}

/**
 * Exercises of the difficulty mode ranked by how much the rest bonuses boost their XP today.
 * Base XP reflects each exercise's difficulty, so the fair comparison is the
 * bonus (effective multiplier); ties go to the exercise with more XP per rep.
 * Multipliers are locked per day, so the ranking is stable for the whole day.
 */
export function recommendExercises(state: GameState, today: DayKey, difficulty: Difficulty): ExerciseRecommendation[] {
  return exercisesForDifficulty(difficulty).map((e) => evaluateExercise(state, e, today)).sort(
    (a, b) => b.effectiveMultiplier - a.effectiveMultiplier || b.xpPerUnit - a.xpPerUnit,
  );
}
