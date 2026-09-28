import { createBoss } from './boss';
import { MUSCLE_IDS, WEAPONS, type WeaponId } from './config';
import { createInitialState, type GameState } from './engine';

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Rebuilds a valid GameState from stored JSON, filling anything missing
 * (e.g. a muscle added to config.ts after the save was written).
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
      level: Math.max(1, Math.floor(num(m.level, initial.level))),
      xp: Math.max(0, num(m.xp, 0)),
      lastTrainedDay: typeof m.lastTrainedDay === 'string' ? m.lastTrainedDay : null,
      streakDays: Math.max(0, Math.floor(num(m.streakDays, 0))),
      dayMultiplier: num(m.dayMultiplier, initial.dayMultiplier),
    };
  }

  if (typeof raw.weaponId === 'string' && raw.weaponId in WEAPONS) state.weaponId = raw.weaponId as WeaponId;

  if (isObject(raw.boss)) {
    const index = Math.max(0, Math.floor(num(raw.boss.index, 0)));
    const fresh = createBoss(index);
    const hp = num(raw.boss.hp, fresh.maxHp);
    state.boss = { index, maxHp: fresh.maxHp, hp: Math.min(Math.max(hp, 1), fresh.maxHp) };
  }

  state.pendingHitSeconds = Math.max(0, num(raw.pendingHitSeconds, 0));
  return state;
}
