import { QUEST, type Difficulty, type ExerciseId, type MuscleId } from './config';
import { daysBetween, type DayKey } from './dates';
import { enemyMaxHp } from './enemy';
import type { GameState, WorkOutcome } from './engine';
import { exercisesForDifficulty, getExercise, isExerciseId, muscleWeights } from './exercises';
import { addXp } from './progression';
import { recommendExercises } from './recommend';
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
  /** Rest bonus of the exercise today (1.2 = +20% XP). */
  effectiveMultiplier: number;
  /** Last time this exercise was done, for context. */
  lastDone: { day: DayKey; amount: number } | null;
}

function dayTotals(history: readonly SetRecord[], exerciseId: ExerciseId, today: DayKey): [DayKey, number][] {
  const totals = new Map<DayKey, number>();
  for (const set of history) {
    if (set.exerciseId !== exerciseId || set.day >= today) continue;
    if (daysBetween(set.day, today) > QUEST.historyDays) continue;
    totals.set(set.day, (totals.get(set.day) ?? 0) + set.amount);
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Today's target, from the last time the exercise was done (progressive, never a huge jump). */
export function questTarget(
  exerciseId: ExerciseId,
  history: readonly SetRecord[],
  today: DayKey,
  effectiveMultiplier: number,
): { target: number; lastDone: DailyQuest['lastDone'] } {
  const exercise = getExercise(exerciseId);
  const unit = exercise.unit;
  const days = dayTotals(history, exerciseId, today);
  const last = days[days.length - 1];
  let target: number;
  if (!last) {
    target = QUEST.startTarget[exercise.tier][unit];
  } else if (daysBetween(last[0], today) >= QUEST.detrainDays) {
    target = Math.round(last[1] * QUEST.detrainFactor);
  } else {
    target = last[1] + Math.max(QUEST.minStep[unit], Math.round(last[1] * QUEST.progression));
  }
  if (effectiveMultiplier < 1) target = Math.round(target * QUEST.tiredFactor);
  target = Math.max(QUEST.minTarget[unit], target);
  return { target, lastDone: last ? { day: last[0], amount: last[1] } : null };
}

export function splitIntoSets(total: number, unit: 'reps' | 'seconds'): { sets: number; perSet: number } {
  const rule = QUEST.sets[unit].find(([min]) => total >= min);
  const sets = rule ? rule[1] : 1;
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
  const { target, lastDone } = questTarget(best.exerciseId, history, today, best.effectiveMultiplier);
  const { sets, perSet } = splitIntoSets(target, exercise.unit);
  let streak = 0;
  if (previous && previous.day < today) {
    const gap = daysBetween(previous.day, today);
    if (gap === 1 && previous.completed) streak = previous.streak + 1;
  } else if (previous && previous.day === today) {
    streak = previous.streak;
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
    effectiveMultiplier: best.effectiveMultiplier,
    lastDone,
  };
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
    effectiveMultiplier: effective,
    lastDone,
  };
}
