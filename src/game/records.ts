import { RECORDS, type ExerciseId } from './config';
import { enemyMaxHp } from './enemy';
import type { GameState } from './engine';

export interface NewRecord {
  exerciseId: ExerciseId;
  /** The new best set (reps, or seconds for holds). */
  amount: number;
  previous: number;
  gold: number;
}

export function recordGold(state: GameState): number {
  return Math.max(RECORDS.minGold, Math.round(enemyMaxHp(state.enemy.level, 0) * RECORDS.goldPerMonsterHp));
}

/**
 * Keeps the best set of each exercise up to date while a set grows (`setAmount` = the set's total so far).
 * Beating the best set that existed when this set started pays gold once per set.
 * The very first set of an exercise only sets the record (nothing to beat).
 */
export function trackRecord(
  state: GameState,
  exerciseId: ExerciseId,
  setId: string,
  setAmount: number,
): { state: GameState; record: NewRecord | null } {
  const run =
    state.recordRun && state.recordRun.setId === setId && state.recordRun.exerciseId === exerciseId
      ? state.recordRun
      : { setId, exerciseId, best: state.records[exerciseId] ?? 0, rewarded: false };
  const current = state.records[exerciseId] ?? 0;
  let next: GameState = {
    ...state,
    records: setAmount > current ? { ...state.records, [exerciseId]: setAmount } : state.records,
    recordRun: run,
  };
  if (run.rewarded || run.best <= 0 || setAmount <= run.best) return { state: next, record: null };
  const gold = recordGold(next);
  next = {
    ...next,
    gold: next.gold + gold,
    recordRun: { ...run, rewarded: true },
    lifetime: { ...next.lifetime, records: next.lifetime.records + 1 },
  };
  return { state: next, record: { exerciseId, amount: setAmount, previous: run.best, gold } };
}

/** Fills missing records from the saved history (players who trained before records existed). */
export function seedRecords(state: GameState, bestSets: Partial<Record<ExerciseId, number>>): GameState {
  let records = state.records;
  for (const [id, amount] of Object.entries(bestSets) as [ExerciseId, number][]) {
    if (amount > (records[id] ?? 0)) records = { ...records, [id]: amount };
  }
  return records === state.records ? state : { ...state, records };
}
