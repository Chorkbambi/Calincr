import { MUSCLE_IDS, type MuscleId } from './config';
import type { DayKey } from './dates';
import type { GameState, Kill } from './engine';
import { isExerciseId } from './exercises';
import { restoreQuest, type DailyQuest } from './quest';
import { restoreState } from './serialization';
import type { SetRecord } from './sets';
import { restoreSettings, type Settings } from './settings';

export const BACKUP_APP = 'calincr';
export const BACKUP_VERSION = 1;
/** Refuse anything bigger: a real backup is far smaller. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface BackupData {
  state: GameState;
  settings: Settings;
  quest: DailyQuest | null;
  /** Camera calibrations, validated by the caller (see pose/calibration). */
  calibrations: unknown;
  sets: SetRecord[];
  kills: Kill[];
}

export interface BackupFile extends Omit<BackupData, 'calibrations'> {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  calibrations: unknown;
}

export function createBackup(data: BackupData, now: Date): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data };
}

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDay = (v: unknown): v is DayKey => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1e9;

function muscleNumbers(v: unknown): Partial<Record<MuscleId, number>> | null {
  if (!isObject(v)) return null;
  const out: Partial<Record<MuscleId, number>> = {};
  for (const [k, n] of Object.entries(v)) {
    if (!(MUSCLE_IDS as readonly string[]).includes(k) || typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
    out[k as MuscleId] = n;
  }
  return out;
}

function restoreSet(v: unknown): SetRecord | null {
  if (!isObject(v)) return null;
  const xp = muscleNumbers(v.xpByMuscle);
  const mult = muscleNumbers(v.multiplierByMuscle);
  if (
    typeof v.id !== 'string' || v.id.length === 0 || v.id.length > 64 ||
    !isIso(v.startedAt) || !isIso(v.updatedAt) || !isDay(v.day) ||
    typeof v.exerciseId !== 'string' || !isExerciseId(v.exerciseId) ||
    !count(v.amount) || !count(v.damage) || !count(v.hits) || !xp || !mult
  ) {
    return null;
  }
  return {
    id: v.id,
    startedAt: v.startedAt,
    updatedAt: v.updatedAt,
    day: v.day,
    exerciseId: v.exerciseId,
    amount: v.amount,
    xpByMuscle: xp,
    multiplierByMuscle: mult,
    damage: v.damage,
    hits: v.hits,
  };
}

function restoreKill(v: unknown): Kill | null {
  if (!isObject(v)) return null;
  if (!count(v.level) || v.level < 1 || !count(v.stage) || typeof v.boss !== 'boolean' || !count(v.maxHp) || !count(v.gold) || !isIso(v.defeatedAt)) {
    return null;
  }
  return { level: v.level, stage: v.stage, boss: v.boss, maxHp: v.maxHp, gold: v.gold, defeatedAt: v.defeatedAt };
}

export type BackupError = 'too_big' | 'not_json' | 'not_a_backup' | 'newer_version';

/** Strictly validates a backup file. Invalid entries are dropped; the file itself must be a Calincr backup. */
export function parseBackup(text: string): { data: BackupData } | { error: BackupError } {
  if (text.length > MAX_BACKUP_BYTES) return { error: 'too_big' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'not_json' };
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP || typeof raw.version !== 'number') return { error: 'not_a_backup' };
  if (raw.version > BACKUP_VERSION) return { error: 'newer_version' };
  const sets = Array.isArray(raw.sets) ? raw.sets.map(restoreSet).filter((s): s is SetRecord => s !== null) : [];
  const kills = Array.isArray(raw.kills) ? raw.kills.map(restoreKill).filter((k): k is Kill => k !== null) : [];
  return {
    data: {
      state: restoreState(raw.state),
      settings: restoreSettings(raw.settings),
      quest: restoreQuest(raw.quest),
      calibrations: raw.calibrations ?? null,
      sets: [...new Map(sets.map((s) => [s.id, s])).values()],
      kills,
    },
  };
}
