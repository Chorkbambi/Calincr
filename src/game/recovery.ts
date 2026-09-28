import { RECOVERY } from './config';
import { daysBetween, type DayKey } from './dates';

export interface RecoveryState {
  /** Last day this muscle was trained, null if never. */
  lastTrainedDay: DayKey | null;
  /** Consecutive training days ending on lastTrainedDay (1 = no streak). */
  streakDays: number;
  /** Multiplier locked for lastTrainedDay. */
  dayMultiplier: number;
}

export const INITIAL_RECOVERY: RecoveryState = {
  lastTrainedDay: null,
  streakDays: 0,
  dayMultiplier: RECOVERY.firstSession,
};

const pick = (values: readonly number[], index: number): number => {
  const clamped = Math.min(Math.max(index, 0), values.length - 1);
  return values[clamped] ?? 1;
};

/**
 * Recovery state once the muscle is trained on `today`.
 * The multiplier is computed at the first session of the day and then kept all day long.
 */
export function recoveryForSession(state: RecoveryState, today: DayKey): RecoveryState {
  if (state.lastTrainedDay === null) {
    return { lastTrainedDay: today, streakDays: 1, dayMultiplier: RECOVERY.firstSession };
  }
  const gap = daysBetween(state.lastTrainedDay, today);
  // Same day, or phone clock moved backwards: keep today's locked multiplier.
  if (gap <= 0) return state;
  if (gap === 1) {
    const streakDays = state.streakDays + 1;
    return { lastTrainedDay: today, streakDays, dayMultiplier: pick(RECOVERY.consecutiveDays, streakDays - 2) };
  }
  return { lastTrainedDay: today, streakDays: 1, dayMultiplier: pick(RECOVERY.afterRestDays, gap - 2) };
}

/** Multiplier the muscle would get (or already has) if trained on `today`. */
export function currentMultiplier(state: RecoveryState, today: DayKey): number {
  return recoveryForSession(state, today).dayMultiplier;
}

export type RecoveryStatus = 'tired' | 'ready' | 'rested';

export function recoveryStatus(multiplier: number): RecoveryStatus {
  if (multiplier < RECOVERY.tiredBelow) return 'tired';
  if (multiplier > RECOVERY.restedAbove) return 'rested';
  return 'ready';
}
