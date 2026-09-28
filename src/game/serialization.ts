import { MUSCLE_IDS, STARTING_WEAPON, type WeaponId } from './config';
import { createEnemy, enemyMaxHp } from './enemy';
import { createInitialState, type GameState } from './engine';
import { isWeaponId } from './shop';

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
  return state;
}
