import { EXERCISE_STYLES, RECOVERY, STYLE_MUSCLES, type Difficulty, type ExerciseConfig, type ExerciseId, type ExerciseStyle, type MuscleId } from './config';
import type { DayKey } from './dates';
import type { GameState } from './engine';
import { exercisesForDifficulty, getExercise, isExerciseId, muscleWeights } from './exercises';
import { currentMultiplier } from './recovery';
import { exerciseStyle } from './styles';

export interface ExerciseRecommendation {
  exerciseId: ExerciseId;
  /** Weighted average of the muscles' rest multipliers: 1.2 = +20 % XP compared to a normal day. */
  effectiveMultiplier: number;
  /** XP per rep (per second for timed exercises) once multipliers are applied. */
  xpPerUnit: number;
  /** Rest multiplier of each worked muscle, strongest share first. */
  muscles: { muscle: MuscleId; weight: number; multiplier: number }[];
  /** Muscle group (push / pull / legs / core) the exercise belongs to. */
  style: ExerciseStyle;
}

export function evaluateExercise(state: GameState, exercise: ExerciseConfig, today: DayKey): ExerciseRecommendation {
  const muscles = muscleWeights(exercise)
    .map(([muscle, weight]) => ({ muscle, weight, multiplier: currentMultiplier(state.muscles[muscle], today) }))
    .sort((a, b) => b.weight - a.weight);
  // Rounded so float noise (0.8 × 1.5 + 0.2 × 1.5) does not break ties.
  const effectiveMultiplier = round4(muscles.reduce((sum, m) => sum + m.weight * m.multiplier, 0));
  return {
    exerciseId: exercise.id as ExerciseId,
    effectiveMultiplier,
    xpPerUnit: exercise.baseXp * effectiveMultiplier,
    muscles,
    style: exerciseStyle(exercise),
  };
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/**
 * How rested a muscle group is today: average of its muscles' rest multipliers.
 * A muscle never trained counts as fully rested (it is the least trained of all).
 * Multipliers are locked for the day, so the score does not move while the player trains.
 */
export function groupRestScore(state: GameState, style: ExerciseStyle, today: DayKey): number {
  const fullyRested = RECOVERY.afterRestDays[RECOVERY.afterRestDays.length - 1]!;
  const muscles = STYLE_MUSCLES[style] as readonly MuscleId[];
  const total = muscles.reduce((sum, m) => {
    const muscle = state.muscles[m];
    return sum + (muscle.lastTrainedDay === null ? fullyRested : currentMultiplier(muscle, today));
  }, 0);
  return round4(total / muscles.length);
}

/**
 * The muscle group the player is already training today (most XP done today), or null.
 * `done` maps exercise ids to the day and amount of their last session.
 */
export function todayFocus(done: Readonly<Record<string, { day: DayKey; amount: number }>>, today: DayKey): ExerciseStyle | null {
  const xp = new Map<ExerciseStyle, number>();
  for (const [id, last] of Object.entries(done)) {
    if (last.day !== today || last.amount <= 0 || !isExerciseId(id)) continue;
    const exercise = getExercise(id);
    const style = exerciseStyle(exercise);
    xp.set(style, (xp.get(style) ?? 0) + last.amount * exercise.baseXp);
  }
  let best: ExerciseStyle | null = null;
  for (const style of EXERCISE_STYLES) {
    if ((xp.get(style) ?? 0) > (best ? xp.get(best)! : 0)) best = style;
  }
  return best;
}

/**
 * Exercises of the difficulty mode, best suggestion first.
 *
 * Players often train one muscle group per day (push day, legs day…), so the ranking works
 * by group rather than mixing a little of everything:
 * 1. the group already trained today (`focus`) stays first all day, like a split;
 * 2. otherwise the least recently trained group (highest group rest score) comes first;
 * 3. inside a group, the rest bonus of the exercise's own muscles, then XP per rep.
 * Multipliers are locked per day, so for a given focus the ranking is stable all day.
 */
export function recommendExercises(
  state: GameState,
  today: DayKey,
  difficulty: Difficulty,
  focus: ExerciseStyle | null = null,
): ExerciseRecommendation[] {
  const groupScore = Object.fromEntries(EXERCISE_STYLES.map((s) => [s, groupRestScore(state, s, today)])) as Record<ExerciseStyle, number>;
  const isFocus = (r: ExerciseRecommendation) => (r.style === focus ? 1 : 0);
  return exercisesForDifficulty(difficulty)
    .map((e) => evaluateExercise(state, e, today))
    .sort(
      (a, b) =>
        isFocus(b) - isFocus(a) ||
        groupScore[b.style] - groupScore[a.style] ||
        EXERCISE_STYLES.indexOf(a.style) - EXERCISE_STYLES.indexOf(b.style) ||
        b.effectiveMultiplier - a.effectiveMultiplier ||
        b.xpPerUnit - a.xpPerUnit,
    );
}

/**
 * Order of the exercise list on the Fight screen: pinned favourites first, then the exercises
 * hitting the enemy's weakness (they deal the most damage), then the rest in suggestion order.
 */
export function sortForBattle(
  ranking: readonly ExerciseRecommendation[],
  weakness: ExerciseStyle,
  favorites: readonly string[],
): ExerciseId[] {
  const pin = (id: string) => {
    const i = favorites.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return ranking
    .map((r, index) => ({ r, index }))
    .sort(
      (a, b) =>
        pin(a.r.exerciseId) - pin(b.r.exerciseId) ||
        (b.r.style === weakness ? 1 : 0) - (a.r.style === weakness ? 1 : 0) ||
        a.index - b.index,
    )
    .map((x) => x.r.exerciseId);
}
