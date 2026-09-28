import type { SQLiteDatabase } from 'expo-sqlite';

import {
  isExerciseId,
  restoreSettings,
  restoreState,
  type DayKey,
  type GameState,
  type Kill,
  type SetRecord,
  type Settings,
} from '../game';

const STATE_KEY = 'game_state';
const SETTINGS_KEY = 'settings';

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

  async loadSettings(): Promise<Settings> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', SETTINGS_KEY);
    return restoreSettings(row ? parseJson<unknown>(row.value, null) : null);
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.putKv(SETTINGS_KEY, JSON.stringify(settings));
  }

  /** Saves the state alone (shop purchases). */
  async saveState(state: GameState): Promise<void> {
    await this.putKv(STATE_KEY, JSON.stringify(state));
  }

  private async putKv(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }

  /** Saves the state, the open set and any kills atomically. */
  async saveProgress(state: GameState, set: SetRecord | null, kills: readonly Kill[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.putKv(STATE_KEY, JSON.stringify(state));
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
      for (const kill of kills) {
        await this.db.runAsync(
          'INSERT INTO kills (level, stage, boss, max_hp, gold, defeated_at) VALUES (?, ?, ?, ?, ?, ?)',
          kill.level,
          kill.stage,
          kill.boss ? 1 : 0,
          kill.maxHp,
          kill.gold,
          kill.defeatedAt,
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

  /** Most recent boss kills, newest first. */
  async listBossKills(limit = 50): Promise<Kill[]> {
    const rows = await this.db.getAllAsync<{
      level: number;
      stage: number;
      boss: number;
      max_hp: number;
      gold: number;
      defeated_at: string;
    }>('SELECT * FROM kills WHERE boss = 1 ORDER BY id DESC LIMIT ?', limit);
    return rows.map((r) => ({
      level: r.level,
      stage: r.stage,
      boss: r.boss === 1,
      maxHp: r.max_hp,
      gold: r.gold,
      defeatedAt: r.defeated_at,
    }));
  }

  async countKills(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM kills');
    return row?.n ?? 0;
  }

  /** Erases the game progress and history but keeps the player's settings. */
  async resetAll(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM kv WHERE key = ?', STATE_KEY);
      await this.db.execAsync('DELETE FROM sets; DELETE FROM boss_kills; DELETE FROM kills;');
    });
  }
}
