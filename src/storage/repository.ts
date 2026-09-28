import type { SQLiteDatabase } from 'expo-sqlite';

import {
  isExerciseId,
  restoreState,
  type DayKey,
  type DefeatedBoss,
  type GameState,
  type SetRecord,
} from '../game';

const STATE_KEY = 'game_state';

interface SetRow {
  id: string;
  started_at: string;
  updated_at: string;
  day: string;
  exercise_id: string;
  amount: number;
  xp_json: string;
  multipliers_json: string;
  damage: number;
  hits: number;
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function toSet(row: SetRow): SetRecord | null {
  if (!isExerciseId(row.exercise_id)) return null; // exercise removed from config
  return {
    id: row.id,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    day: row.day,
    exerciseId: row.exercise_id,
    amount: row.amount,
    xpByMuscle: parseJson(row.xp_json, {}),
    multiplierByMuscle: parseJson(row.multipliers_json, {}),
    damage: row.damage,
    hits: row.hits,
  };
}

/** The only place that knows the SQLite schema. */
export class GameRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async loadState(): Promise<GameState> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', STATE_KEY);
    return restoreState(row ? parseJson<unknown>(row.value, null) : null);
  }

  /** Saves the state, the open set and any defeated bosses atomically. */
  async saveProgress(state: GameState, set: SetRecord | null, defeated: readonly DefeatedBoss[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        STATE_KEY,
        JSON.stringify(state),
      );
      if (set) {
        await this.db.runAsync(
          `INSERT INTO sets (id, started_at, updated_at, day, exercise_id, amount, xp_json, multipliers_json, damage, hits)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, amount = excluded.amount,
             xp_json = excluded.xp_json, multipliers_json = excluded.multipliers_json,
             damage = excluded.damage, hits = excluded.hits`,
          set.id,
          set.startedAt,
          set.updatedAt,
          set.day,
          set.exerciseId,
          set.amount,
          JSON.stringify(set.xpByMuscle),
          JSON.stringify(set.multiplierByMuscle),
          set.damage,
          set.hits,
        );
      }
      for (const boss of defeated) {
        await this.db.runAsync(
          'INSERT OR REPLACE INTO boss_kills (boss_index, max_hp, defeated_at) VALUES (?, ?, ?)',
          boss.index,
          boss.maxHp,
          boss.defeatedAt,
        );
      }
    });
  }

  /** Sets between two days, inclusive. */
  async listSets(from: DayKey, to: DayKey): Promise<SetRecord[]> {
    const rows = await this.db.getAllAsync<SetRow>(
      'SELECT * FROM sets WHERE day >= ? AND day <= ? ORDER BY started_at',
      from,
      to,
    );
    return rows.map(toSet).filter((s): s is SetRecord => s !== null);
  }

  async listDefeatedBosses(): Promise<DefeatedBoss[]> {
    const rows = await this.db.getAllAsync<{ boss_index: number; max_hp: number; defeated_at: string }>(
      'SELECT * FROM boss_kills ORDER BY boss_index DESC',
    );
    return rows.map((r) => ({ index: r.boss_index, maxHp: r.max_hp, defeatedAt: r.defeated_at }));
  }

  async resetAll(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.execAsync('DELETE FROM kv; DELETE FROM sets; DELETE FROM boss_kills;');
    });
  }
}
