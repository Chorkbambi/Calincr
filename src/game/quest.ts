import { EXERCISES, QUEST, type Difficulty, type ExerciseId, type MuscleId } from './config';
import { daysBetween, type DayKey } from './dates';
import { enemyMaxHp } from './enemy';
import type { GameState, WorkOutcome } from './engine';
import { exercisesForDifficulty, getExercise, isExerciseId, muscleWeights } from './exercises';
import { addXp } from './progression';
import { recommendExercises } from './recommend';
import { exerciseStyle } from './styles';
import type { SetRecord } from './sets';

/** The one exercise suggested for the day. The app motivates; it doesn't coach. */
export interface DailyQuest {
  day: DayKey;
  exerciseId: ExerciseId;
  /** Reps (or seconds for holds) to do today, in total. */
  target: number;
  sets: number;
  perSet: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
  rewardGold: number;
  /** Quests completed on consecutive days before today. */
  streak: number;
  /** Streak freezes spent to keep the streak when this quest was created. */
  freezesUsed: number;
  /** Rest bonus of the exercise today (1.2 = +20% XP). */
  effectiveMultiplier: number;
  /** Last time this exercise was done, for context. */
  lastDone: { day: DayKey; amount: number } | null;
}

interface DayTotal {
  day: DayKey;
  total: number;
  /** Real sets that day (tiny leftover sets under half the best set are not counted). */
  sets: number;
}

function dayTotals(history: readonly SetRecord[], exerciseId: ExerciseId, today: DayKey): DayTotal[] {
  const days = new Map<DayKey, number[]>();
  for (const set of history) {
    if (set.exerciseId !== exerciseId || set.day >= today || set.amount <= 0) continue;
    if (daysBetween(set.day, today) > QUEST.historyDays) continue;
    days.set(set.day, [...(days.get(set.day) ?? []), set.amount]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, amounts]) => {
      const best = Math.max(...amounts);
      return {
        day,
        total: amounts.reduce((sum, a) => sum + a, 0),
        sets: amounts.filter((a) => a >= best * QUEST.realSetRatio).length,
      };
    });
}

/**
 * Never done this exercise: estimate from the most recent session of a sibling exercise
 * (same muscle group, same unit), scaled by difficulty (base XP). 3 × 15 squats means
 * the player is not asked for 3 × 5 lunges.
 */
function estimateFromSiblings(
  exerciseId: ExerciseId,
  history: readonly SetRecord[],
  today: DayKey,
): { from: ExerciseId; day: DayKey; total: number; sets: number } | null {
  const exercise = getExercise(exerciseId);
  const style = exerciseStyle(exercise);
  let best: { from: ExerciseId; day: DayKey; total: number; sets: number } | null = null;
  for (const other of EXERCISES) {
    if (other.id === exerciseId || other.unit !== exercise.unit || exerciseStyle(other) !== style) continue;
    const last = dayTotals(history, other.id as ExerciseId, today).at(-1);
    if (!last || (best && last.day <= best.day)) continue;
    best = { from: other.id as ExerciseId, day: last.day, total: Math.round((last.total * other.baseXp) / exercise.baseXp), sets: last.sets };
  }
  return best;
}

export interface QuestTarget {
  target: number;
  lastDone: DailyQuest['lastDone'];
  /** Number of sets the player did last time (or on the sibling exercise): kept for today's quest. */
  preferredSets?: number;
  /** Target estimated from another exercise of the same group. */
  estimatedFrom?: ExerciseId;
}

/** Today's target, from the last time the exercise was done (progressive, never a huge jump). */
export function questTarget(
  exerciseId: ExerciseId,
  history: readonly SetRecord[],
  today: DayKey,
  effectiveMultiplier: number,
): QuestTarget {
  const exercise = getExercise(exerciseId);
  const unit = exercise.unit;
  const last = dayTotals(history, exerciseId, today).at(-1);
  const result: QuestTarget = { target: 0, lastDone: last ? { day: last.day, amount: last.total } : null };
  const detrain = (day: DayKey) => {
    const gap = daysBetween(day, today);
    return gap >= QUEST.longDetrainDays ? QUEST.longDetrainFactor : gap >= QUEST.detrainDays ? QUEST.detrainFactor : 1;
  };
  let target: number;
  if (last) {
    const factor = detrain(last.day);
    target = factor < 1 ? Math.round(last.total * factor) : last.total + Math.max(QUEST.minStep[unit], Math.round(last.total * QUEST.progression));
    result.preferredSets = last.sets;
  } else {
    const sibling = estimateFromSiblings(exerciseId, history, today);
    if (sibling && sibling.total > 0) {
      target = Math.round(sibling.total * detrain(sibling.day));
      result.preferredSets = sibling.sets;
      result.estimatedFrom = sibling.from;
    } else {
      target = QUEST.startTarget[exercise.tier][unit];
    }
  }
  if (effectiveMultiplier < 1) target = Math.round(target * QUEST.tiredFactor);
  result.target = Math.max(QUEST.minTarget[unit], target);
  if (result.preferredSets === undefined) delete result.preferredSets;
  if (result.estimatedFrom === undefined) delete result.estimatedFrom;
  return result;
}

/** Splits a total into sets: the player's own number of sets when known, else the default table. */
export function splitIntoSets(total: number, unit: 'reps' | 'seconds', preferredSets?: number): { sets: number; perSet: number } {
  let sets: number;
  if (preferredSets !== undefined && preferredSets > 0) {
    sets = Math.min(QUEST.maxSets, preferredSets, total);
  } else {
    const rule = QUEST.sets[unit].find(([min]) => total >= min);
    sets = rule ? rule[1] : 1;
  }
  return { sets, perSet: Math.ceil(total / sets) };
}

/**
 * Picks today's quest: the exercise with the best rest bonus in the player's difficulty mode,
 * with a target based on what they did last time.
 */
export function createDailyQuest(
  state: GameState,
  today: DayKey,
  difficulty: Difficulty,
  history: readonly SetRecord[],
  previous: DailyQuest | null,
): DailyQuest {
  const best = recommendExercises(state, today, difficulty)[0];
  if (!best) throw new Error('No exercise available');
  const exercise = getExercise(best.exerciseId);
  const { target, lastDone, preferredSets } = questTarget(best.exerciseId, history, today, best.effectiveMultiplier);
  const { sets, perSet } = splitIntoSets(target, exercise.unit, preferredSets);
  let streak = 0;
  let freezesUsed = 0;
  if (previous && previous.day < today) {
    const kept = previous.streak + (previous.completed ? 1 : 0);
    const missed = daysBetween(previous.day, today) - (previous.completed ? 1 : 0);
    if (missed === 0) {
      streak = kept;
    } else if (kept > 0 && missed <= state.streakFreezes) {
      streak = kept;
      freezesUsed = missed;
    }
  } else if (previous && previous.day === today) {
    streak = previous.streak;
    freezesUsed = previous.freezesUsed;
  }
  return {
    day: today,
    exerciseId: best.exerciseId,
    target,
    sets,
    perSet,
    progress: 0,
    completed: false,
    rewardXp: Math.round(target * exercise.baseXp * QUEST.xpBonusRatio),
    rewardGold: Math.max(QUEST.minGold, Math.round(enemyMaxHp(state.enemy.level, 0) * QUEST.goldPerMonsterHp)),
    streak,
    freezesUsed,
    effectiveMultiplier: best.effectiveMultiplier,
    lastDone,
  };
}

/** Spends the freezes a new day's quest used (call once, when the quest replaces one from an earlier day). */
export function spendStreakFreezes(state: GameState, quest: DailyQuest): GameState {
  if (quest.freezesUsed <= 0) return state;
  return { ...state, streakFreezes: Math.max(0, state.streakFreezes - quest.freezesUsed) };
}

/** True when the stored quest should be replaced (new day, or its exercise left the difficulty mode untouched). */
export function questNeedsRefresh(quest: DailyQuest | null, today: DayKey, difficulty: Difficulty): boolean {
  if (!quest || quest.day !== today) return true;
  const offered = exercisesForDifficulty(difficulty).some((e) => e.id === quest.exerciseId);
  return !offered && quest.progress === 0 && !quest.completed;
}

/** Counts work towards the quest. `justCompleted` is true only on the rep that completes it. */
export function progressQuest(quest: DailyQuest, outcome: WorkOutcome): { quest: DailyQuest; justCompleted: boolean } {
  if (quest.completed || outcome.exerciseId !== quest.exerciseId || outcome.day !== quest.day || outcome.amount <= 0) {
    return { quest, justCompleted: false };
  }
  const progress = quest.progress + outcome.amount;
  const completed = progress >= quest.target;
  return { quest: { ...quest, progress, completed }, justCompleted: completed };
}

/** Gives the quest reward: bonus XP split over the exercise's muscles, and gold. */
export function applyQuestReward(
  state: GameState,
  quest: DailyQuest,
): { state: GameState; levelUps: { muscle: MuscleId; level: number }[] } {
  const next: GameState = {
    ...state,
    muscles: { ...state.muscles },
    gold: state.gold + quest.rewardGold,
    lifetime: {
      ...state.lifetime,
      questsCompleted: state.lifetime.questsCompleted + 1,
      bestQuestStreak: Math.max(state.lifetime.bestQuestStreak, quest.streak + 1),
    },
  };
  const levelUps: { muscle: MuscleId; level: number }[] = [];
  for (const [muscle, weight] of muscleWeights(getExercise(quest.exerciseId))) {
    const current = next.muscles[muscle];
    const progress = addXp(current, quest.rewardXp * weight);
    if (progress.level > current.level) levelUps.push({ muscle, level: progress.level });
    next.muscles[muscle] = { ...current, ...progress };
  }
  return { state: next, levelUps };
}

/** Validates a stored quest (null if unusable). */
export function restoreQuest(raw: unknown): DailyQuest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const q = raw as Record<string, unknown>;
  const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const day = typeof q.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.day) ? q.day : null;
  const exerciseId = typeof q.exerciseId === 'string' && isExerciseId(q.exerciseId) ? q.exerciseId : null;
  const target = int(q.target);
  const sets = int(q.sets);
  const perSet = int(q.perSet);
  const progress = int(q.progress);
  const rewardXp = int(q.rewardXp);
  const rewardGold = int(q.rewardGold);
  const streak = int(q.streak);
  if (!day || !exerciseId || !target || !sets || !perSet || progress === null || rewardXp === null || rewardGold === null || streak === null) {
    return null;
  }
  const last = q.lastDone as Record<string, unknown> | null | undefined;
  const lastDone =
    last && typeof last.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(last.day) && int(last.amount) !== null
      ? { day: last.day, amount: int(last.amount)! }
      : null;
  const effective = typeof q.effectiveMultiplier === 'number' && Number.isFinite(q.effectiveMultiplier) ? q.effectiveMultiplier : 1;
  return {
    day,
    exerciseId,
    target,
    sets,
    perSet,
    progress,
    completed: q.completed === true && progress >= target,
    rewardXp,
    rewardGold,
    streak,
    freezesUsed: int(q.freezesUsed) ?? 0,
    effectiveMultiplier: effective,
    lastDone,
  };
}
