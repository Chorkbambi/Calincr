import { RECORDS, type ExerciseId } from './config';
import type { DayKey } from './dates';
import { enemyMaxHp } from './enemy';
import type { GameState } from './engine';

export interface NewRecord {
  exerciseId: ExerciseId;
  /** The new best session (all sets of the exercise that day: reps, or seconds for holds). */
  amount: number;
  previous: number;
  gold: number;
}

/** Best session of an exercise: its total over one day, all sets together. */
export interface SessionRecord {
  amount: number;
  day: DayKey;
}

export function recordGold(state: GameState): number {
  return Math.max(RECORDS.minGold, Math.round(enemyMaxHp(state.enemy.level, 0) * RECORDS.goldPerMonsterHp));
}

/**
 * Keeps the best single set of each exercise up to date (skills and harder variations use it).
 * Silent: the record that pays is the best session, checked when the exercise is finished.
 */
export function updateBestSet(state: GameState, exerciseId: ExerciseId, setAmount: number): GameState {
  if (!(setAmount > (state.records[exerciseId] ?? 0))) return state;
  return { ...state, records: { ...state.records, [exerciseId]: Math.floor(setAmount) } };
}

/**
 * Checked when an exercise is finished (all its sets): `total` = everything done on that exercise today.
 * Beating the best session of an earlier day pays gold, once a day per exercise.
 * The very first session only sets the record (nothing to beat).
 */
export function checkSessionRecord(
  state: GameState,
  exerciseId: ExerciseId,
  day: DayKey,
  total: number,
): { state: GameState; record: NewRecord | null } {
  const amount = Number.isFinite(total) ? Math.floor(total) : 0;
  const current = state.sessionRecords[exerciseId];
  if (amount <= 0 || (current && amount <= current.amount)) return { state, record: null };
  const next: GameState = { ...state, sessionRecords: { ...state.sessionRecords, [exerciseId]: { amount, day } } };
  // Already beaten (or first set) today: the record grows, the reward was given once.
  if (!current || current.day >= day) return { state: next, record: null };
  const gold = recordGold(next);
  return {
    state: { ...next, gold: next.gold + gold, lifetime: { ...next.lifetime, records: next.lifetime.records + 1 } },
    record: { exerciseId, amount, previous: current.amount, gold },
  };
}

/**
 * Fills missing records from the saved history (players who trained before records existed).
 * `bestSessions` must only hold days before today, so today's unfinished exercise can still beat them.
 */
export function seedRecords(
  state: GameState,
  bestSets: Partial<Record<ExerciseId, number>>,
  bestSessions: Partial<Record<ExerciseId, SessionRecord>> = {},
): GameState {
  let records = state.records;
  for (const [id, amount] of Object.entries(bestSets) as [ExerciseId, number][]) {
    if (amount > (records[id] ?? 0)) records = { ...records, [id]: amount };
  }
  let sessionRecords = state.sessionRecords;
  for (const [id, best] of Object.entries(bestSessions) as [ExerciseId, SessionRecord][]) {
    if (best.amount > (sessionRecords[id]?.amount ?? 0)) sessionRecords = { ...sessionRecords, [id]: best };
  }
  return records === state.records && sessionRecords === state.sessionRecords ? state : { ...state, records, sessionRecords };
}
