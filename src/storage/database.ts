import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'cali-incr.db';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY NOT NULL,
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    day TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    xp_json TEXT NOT NULL,
    multipliers_json TEXT NOT NULL,
    damage INTEGER NOT NULL,
    hits INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sets_day ON sets (day);
  CREATE TABLE IF NOT EXISTS boss_kills (
    boss_index INTEGER PRIMARY KEY NOT NULL,
    max_hp INTEGER NOT NULL,
    defeated_at TEXT NOT NULL
  );
  `,
  // v2: monster levels. Old boss_kills rows are kept but no longer used.
  `
  CREATE TABLE IF NOT EXISTS kills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL,
    stage INTEGER NOT NULL,
    boss INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    gold INTEGER NOT NULL,
    defeated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS kills_boss ON kills (boss);
  `,
];

/** Runs pending migrations, tracked with PRAGMA user_version. */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    if (sql === undefined) break;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
