import { bossMaxHp, bossName, createBoss } from '../boss';
import { COMBAT, MUSCLE_IDS, WEAPONS } from '../config';
import { applyWork, createInitialState, hitDamage, totalLevels, type GameState } from '../engine';

const NOW = new Date(2026, 2, 10, 18, 0, 0); // local 2026-03-10

const withLevels = (state: GameState, level: number): GameState => {
  const muscles = { ...state.muscles };
  for (const id of MUSCLE_IDS) muscles[id] = { ...muscles[id], level };
  return { ...state, muscles };
};

describe('damage', () => {
  it('starts at 10 (10 muscles at level 1) with the ×1 starter sword', () => {
    const state = createInitialState();
    expect(WEAPONS[state.weaponId].damageMultiplier).toBe(1);
    expect(totalLevels(state)).toBe(10);
    expect(hitDamage(state)).toBe(10);
  });

  it('is the sum of all muscle levels × weapon multiplier', () => {
    const state = createInitialState();
    const muscles = { ...state.muscles, chest: { ...state.muscles.chest, level: 5 }, calves: { ...state.muscles.calves, level: 3 } };
    expect(hitDamage({ ...state, muscles })).toBe(5 + 3 + 8);
    expect(hitDamage(withLevels(state, 4))).toBe(40);
  });
});

describe('boss progression', () => {
  it('follows round(20 × 1.35^index)', () => {
    expect(bossMaxHp(0)).toBe(20);
    expect(bossMaxHp(1)).toBe(27);
    expect(bossMaxHp(2)).toBe(Math.round(20 * 1.35 ** 2)); // 36
    expect(bossMaxHp(10)).toBe(Math.round(20 * 1.35 ** 10));
  });

  it('creates a boss at full health', () => {
    expect(createBoss(3)).toEqual({ index: 3, hp: bossMaxHp(3), maxHp: bossMaxHp(3) });
  });

  it('names bosses and cycles with numerals', () => {
    expect(bossName(0)).toBe('Golem de paille');
    expect(bossName(12)).toBe('Golem de paille II');
  });
});

describe('applyWork', () => {
  it('turns each rep into one hit, then grants XP', () => {
    const { state, outcome } = applyWork(createInitialState(), 'pushup', { kind: 'reps', count: 1 }, NOW);
    expect(outcome.hits).toEqual([{ damage: 10, bossIndex: 0, bossHpAfter: 10, bossMaxHp: 20, defeated: false }]);
    expect(state.boss.hp).toBe(10);
    expect(outcome.xpByMuscle).toEqual({ chest: 5, triceps: 3, shoulders: 2 });
    expect(state.muscles.chest.xp).toBe(5);
  });

  it('defeats the boss and spawns the next one with more HP', () => {
    const { state, outcome } = applyWork(createInitialState(), 'crunch', { kind: 'reps', count: 2 }, NOW);
    expect(outcome.hits[1]?.defeated).toBe(true);
    expect(outcome.defeatedBosses).toEqual([{ index: 0, maxHp: 20, defeatedAt: NOW.toISOString() }]);
    expect(state.boss).toEqual({ index: 1, hp: 27, maxHp: 27 });
  });

  it('does not carry overkill damage to the next boss', () => {
    const { state } = applyWork(withLevels(createInitialState(), 10), 'crunch', { kind: 'reps', count: 1 }, NOW);
    expect(state.boss).toEqual(createBoss(1));
  });

  it('can defeat several bosses in one burst', () => {
    const { state, outcome } = applyWork(createInitialState(), 'squat', { kind: 'reps', count: 30 }, NOW);
    expect(outcome.hits).toHaveLength(30);
    expect(outcome.defeatedBosses.length).toBeGreaterThan(1);
    expect(state.boss.index).toBe(outcome.defeatedBosses.length);
  });

  it('uses levels gained during the set for later hits', () => {
    // Calf raises: 5 XP per rep to calves, level 2 reached at 50 XP = 10 reps.
    const { outcome } = applyWork(createInitialState(), 'calf_raise', { kind: 'reps', count: 11 }, NOW);
    expect(outcome.hits[9]?.damage).toBe(10);
    expect(outcome.hits[10]?.damage).toBe(11);
    expect(outcome.levelUps).toEqual([{ muscle: 'calves', level: 2 }]);
  });

  it('applies the rest multiplier of each muscle', () => {
    const base = createInitialState();
    const rested: GameState = {
      ...base,
      muscles: {
        ...base.muscles,
        back: { ...base.muscles.back, lastTrainedDay: '2026-03-01', streakDays: 1 },
        biceps: { ...base.muscles.biceps, lastTrainedDay: '2026-03-09', streakDays: 1 },
      },
    };
    const { outcome, state } = applyWork(rested, 'pullup', { kind: 'reps', count: 1 }, NOW);
    expect(outcome.multiplierByMuscle).toEqual({ back: 1.5, biceps: 0.7 });
    expect(outcome.xpByMuscle.back).toBeCloseTo(16 * 0.6 * 1.5);
    expect(outcome.xpByMuscle.biceps).toBeCloseTo(16 * 0.4 * 0.7);
    expect(state.muscles.back.lastTrainedDay).toBe('2026-03-10');
    expect(state.muscles.chest.lastTrainedDay).toBeNull();
  });

  it('keeps the multiplier for several sets on the same day', () => {
    const base = createInitialState();
    const start: GameState = {
      ...base,
      muscles: { ...base.muscles, abs: { ...base.muscles.abs, lastTrainedDay: '2026-03-05', streakDays: 1 } },
    };
    const first = applyWork(start, 'crunch', { kind: 'reps', count: 5 }, NOW);
    const later = applyWork(first.state, 'crunch', { kind: 'reps', count: 5 }, new Date(2026, 2, 10, 22, 0));
    expect(first.outcome.multiplierByMuscle.abs).toBe(1.5);
    expect(later.outcome.multiplierByMuscle.abs).toBe(1.5);
    const nextDay = applyWork(later.state, 'crunch', { kind: 'reps', count: 1 }, new Date(2026, 2, 11, 8, 0));
    expect(nextDay.outcome.multiplierByMuscle.abs).toBe(0.7);
  });

  it('hits once every secondsPerHit seconds of plank and carries the remainder', () => {
    const first = applyWork(createInitialState(), 'plank', { kind: 'seconds', seconds: 12 }, NOW);
    expect(first.outcome.hits).toHaveLength(Math.floor(12 / COMBAT.secondsPerHit));
    expect(first.state.pendingHitSeconds).toBe(12 % COMBAT.secondsPerHit);
    const second = applyWork(first.state, 'plank', { kind: 'seconds', seconds: 3 }, NOW);
    expect(second.outcome.hits).toHaveLength(1);
    expect(second.outcome.xpByMuscle.abs).toBeCloseTo(3 * 2 * 0.7);
  });

  it('ignores empty or negative input and never mutates the previous state', () => {
    const initial = createInitialState();
    const snapshot = JSON.parse(JSON.stringify(initial));
    expect(applyWork(initial, 'pushup', { kind: 'reps', count: 0 }, NOW).outcome.hits).toHaveLength(0);
    expect(applyWork(initial, 'pushup', { kind: 'reps', count: -3 }, NOW).outcome.amount).toBe(0);
    applyWork(initial, 'pushup', { kind: 'reps', count: 50 }, NOW);
    expect(initial).toEqual(snapshot);
  });
});
