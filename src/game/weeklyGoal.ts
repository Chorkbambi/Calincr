import { WEEKLY_GOAL } from './config';
import { daysBetween, startOfWeek, type DayKey } from './dates';
import { enemyMaxHp } from './enemy';
import type { GameState } from './engine';

/**
 * Weekly goal: train on `goal` different days of the week (Monday to Sunday).
 * The streak counts weeks in a row where the goal was met, so rest days never break it.
 */
export interface WeeklyGoalState {
  /** Monday of the week being tracked ('' = never trained yet). */
  weekStart: DayKey | '';
  /** Different days trained this week. */
  days: DayKey[];
  /** Training days wanted per week (picked by the player). */
  goal: number;
  /** Weeks in a row with the goal met (the current week counts once it is met). */
  streak: number;
  best: number;
  /** This week's goal is met (and its gold paid). */
  rewarded: boolean;
}

export const INITIAL_WEEKLY_GOAL: WeeklyGoalState = {
  weekStart: '',
  days: [],
  goal: WEEKLY_GOAL.defaultDays,
  streak: 0,
  best: 0,
  rewarded: false,
};

export function clampWeeklyGoal(days: number): number {
  if (!Number.isFinite(days)) return WEEKLY_GOAL.defaultDays;
  return Math.min(WEEKLY_GOAL.maxDays, Math.max(WEEKLY_GOAL.minDays, Math.round(days)));
}

export function weeklyGoalGold(state: GameState): number {
  return Math.max(WEEKLY_GOAL.minGold, Math.round(enemyMaxHp(state.enemy.level, 0) * WEEKLY_GOAL.goldPerMonsterHp));
}

/**
 * The weekly goal as of `today`: when a new week started, the streak survives only if every
 * finished week met its goal, or if streak freezes cover the missed weeks (one per week).
 */
export function rollWeeklyGoal(state: GameState, today: DayKey): { weekly: WeeklyGoalState; freezesUsed: number } {
  const w = state.weekly;
  const weekStart = startOfWeek(today);
  if (w.weekStart === weekStart) return { weekly: w, freezesUsed: 0 };
  if (w.weekStart === '') return { weekly: { ...w, weekStart, days: [], rewarded: false }, freezesUsed: 0 };
  const weeks = Math.round(daysBetween(w.weekStart, weekStart) / 7);
  // Phone clock moved back: keep the week as it is.
  if (weeks <= 0) return { weekly: w, freezesUsed: 0 };
  const missed = weeks - (w.rewarded ? 1 : 0);
  let streak = w.streak;
  let freezesUsed = 0;
  if (missed > 0) {
    if (streak > 0 && missed <= state.streakFreezes) freezesUsed = missed;
    else streak = 0;
  }
  return { weekly: { ...w, weekStart, days: [], rewarded: false, streak }, freezesUsed };
}

/**
 * Counts `day` as a training day (mutates the working copy made by applyWork).
 * Returns the gold paid when this day meets the week's goal, else null.
 */
export function recordTrainingDay(state: GameState, day: DayKey): number | null {
  const rolled = rollWeeklyGoal(state, day);
  state.streakFreezes -= rolled.freezesUsed;
  let weekly = rolled.weekly;
  if (!weekly.days.includes(day)) weekly = { ...weekly, days: [...weekly.days, day] };
  let gold: number | null = null;
  if (!weekly.rewarded && weekly.days.length >= weekly.goal) {
    const streak = weekly.streak + 1;
    weekly = { ...weekly, rewarded: true, streak, best: Math.max(weekly.best, streak) };
    gold = weeklyGoalGold(state);
    state.gold += gold;
  }
  state.weekly = weekly;
  return gold;
}

/** Changes the number of training days wanted per week (applies to the current week). */
export function setWeeklyGoal(state: GameState, days: number): { state: GameState } {
  return { state: { ...state, weekly: { ...state.weekly, goal: clampWeeklyGoal(days) } } };
}
