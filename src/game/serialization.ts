import { MUSCLE_IDS, STARTING_WEAPON, type WeaponId } from './config';
import { createEnemy, enemyMaxHp } from './enemy';
import { createInitialState, EMPTY_LIFETIME, type GameState } from './engine';
import { isWeaponId } from './shop';
import { ACHIEVEMENTS } from './achievements';

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const int = (v: unknown, fallback: number, min: number): number => Math.max(min, Math.floor(num(v, fallback)));

/**
 * Rebuilds a valid GameState from stored JSON, filling anything missing
 * (e.g. a muscle added to config.ts after the save was written) and
 * rejecting anything out of range, so a corrupted save can never crash the game.
 */
export function restoreState(raw: unknown): GameState {
  const state = createInitialState();
  if (!isObject(raw)) return state;

  const muscles = isObject(raw.muscles) ? raw.muscles : {};
  for (const id of MUSCLE_IDS) {
    const m = muscles[id];
    if (!isObject(m)) continue;
    const initial = state.muscles[id];
    state.muscles[id] = {
      level: int(m.level, initial.level, 1),
      xp: Math.max(0, num(m.xp, 0)),
      lastTrainedDay: typeof m.lastTrainedDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.lastTrainedDay) ? m.lastTrainedDay : null,
      streakDays: int(m.streakDays, 0, 0),
      dayMultiplier: num(m.dayMultiplier, initial.dayMultiplier),
    };
  }

  const owned = Array.isArray(raw.ownedWeapons)
    ? raw.ownedWeapons.filter((w): w is WeaponId => typeof w === 'string' && isWeaponId(w))
    : [];
  state.ownedWeapons = [...new Set<WeaponId>([STARTING_WEAPON, ...owned])];
  if (typeof raw.weaponId === 'string' && isWeaponId(raw.weaponId) && state.ownedWeapons.includes(raw.weaponId)) {
    state.weaponId = raw.weaponId;
  }
  state.gold = int(raw.gold, 0, 0);

  // Saves from before levels existed stored a `boss` instead: they restart at level 1.
  if (isObject(raw.enemy)) {
    const level = int(raw.enemy.level, 1, 1);
    const stage = Math.min(int(raw.enemy.stage, 0, 0), 10_000);
    const fresh = createEnemy(level, stage);
    const hp = num(raw.enemy.hp, fresh.maxHp);
    state.enemy = { level, stage: fresh.stage, maxHp: enemyMaxHp(level, fresh.stage), hp: Math.min(Math.max(hp, 1), fresh.maxHp) };
  }

  state.pendingHitSeconds = Math.max(0, num(raw.pendingHitSeconds, 0));

  if (isObject(raw.combo)) {
    state.combo = { count: int(raw.combo.count, 0, 0), lastHitAt: Math.max(0, num(raw.combo.lastHitAt, 0)) };
  }

  const life = isObject(raw.lifetime) ? raw.lifetime : {};
  state.lifetime = {
    reps: int(life.reps, 0, 0),
    holdSeconds: int(life.holdSeconds, 0, 0),
    kills: int(life.kills, 0, 0),
    bosses: int(life.bosses, 0, 0),
    questsCompleted: int(life.questsCompleted, 0, 0),
    bestQuestStreak: int(life.bestQuestStreak, 0, 0),
    activeDays: int(life.activeDays, 0, 0),
    lastActiveDay:
      typeof life.lastActiveDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(life.lastActiveDay)
        ? life.lastActiveDay
        : EMPTY_LIFETIME.lastActiveDay,
  };

  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  state.achievements = Array.isArray(raw.achievements)
    ? [...new Set(raw.achievements.filter((a): a is string => typeof a === 'string' && known.has(a)))]
    : [];
  return state;
}
