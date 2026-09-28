import { COMBAT, ENEMIES, MUSCLE_IDS } from '../config';
import { createEnemy, enemyMaxHp, enemyName, goldReward, isBossStage, nextEnemy } from '../enemy';
import { applyWork, createInitialState, hitDamage, totalLevels, type GameState } from '../engine';
import { zoneForLevel } from '../zones';

const NOW = new Date(2026, 2, 10, 18, 0, 0); // local 2026-03-10

const withLevels = (state: GameState, level: number): GameState => {
  const muscles = { ...state.muscles };
  for (const id of MUSCLE_IDS) muscles[id] = { ...muscles[id], level };
  return { ...state, muscles };
};

describe('damage', () => {
  it('starts at 10 (10 muscles at level 1) with the ×1 starting sword', () => {
    const state = createInitialState();
    expect(state.weaponId).toBe('rusty_sword');
    expect(totalLevels(state)).toBe(10);
    expect(hitDamage(state)).toBe(10);
  });

  it('is the sum of all muscle levels × weapon multiplier', () => {
    const state = createInitialState();
    const muscles = {
      ...state.muscles,
      chest: { ...state.muscles.chest, level: 5 },
      calves: { ...state.muscles.calves, level: 3 },
    };
    expect(hitDamage({ ...state, muscles })).toBe(5 + 3 + 8);
    expect(hitDamage(withLevels(state, 4))).toBe(40);
    expect(hitDamage({ ...withLevels(state, 4), weaponId: 'iron_sword', ownedWeapons: ['rusty_sword', 'iron_sword'] })).toBe(60);
  });
});

describe('enemies and levels', () => {
  it('follows the HP formula, the boss being the 11th fight', () => {
    expect(enemyMaxHp(1, 0)).toBe(20);
    expect(enemyMaxHp(1, 1)).toBe(Math.round(20 * 1.08));
    expect(enemyMaxHp(2, 0)).toBe(Math.round(20 * 1.6));
    expect(isBossStage(ENEMIES.monstersPerLevel)).toBe(true);
    expect(enemyMaxHp(1, 10)).toBe(Math.round(20 * (1 + 10 * 0.08) * 4));
  });

  it('goes through 10 monsters, then the boss, then the next level forever', () => {
    let enemy = createEnemy(1, 0);
    const seen: string[] = [];
    for (let i = 0; i < 23; i++) {
      seen.push(`${enemy.level}.${enemy.stage}`);
      enemy = nextEnemy(enemy);
    }
    expect(seen.slice(0, 12)).toEqual(['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '2.0']);
    expect(seen[22]).toBe('3.0');
    expect(nextEnemy(createEnemy(999, 10))).toEqual(createEnemy(1000, 0));
  });

  it('drops gold, more for bosses', () => {
    expect(goldReward(createEnemy(1, 0))).toBe(5);
    expect(goldReward({ stage: 0, maxHp: 1 })).toBe(1);
    const boss = createEnemy(1, 10);
    expect(goldReward(boss)).toBe(Math.round(boss.maxHp * 0.25) * 2);
  });

  it('changes zone every 10 levels and loops with a numeral', () => {
    expect(zoneForLevel(1).title).toBe('Whispering Meadows');
    expect(zoneForLevel(10).title).toBe('Whispering Meadows');
    expect(zoneForLevel(11).title).toBe('Gloomwood Forest');
    expect(zoneForLevel(81).title).toBe('Whispering Meadows II');
    expect(zoneForLevel(81).number).toBe(8);
  });

  it('names monsters from the zone roster and bosses from the boss list', () => {
    expect(zoneForLevel(1).monsters).toContain(enemyName(1, 0));
    expect(zoneForLevel(1).bosses).toContain(enemyName(1, 10));
    expect(zoneForLevel(15).monsters).toContain(enemyName(15, 3));
  });
});

describe('applyWork', () => {
  it('turns each rep into one hit, then grants XP', () => {
    const { state, outcome } = applyWork(createInitialState(), 'pushup', { kind: 'reps', count: 1 }, NOW);
    expect(outcome.hits).toEqual([{ damage: 10, enemy: { level: 1, stage: 0, hp: 10, maxHp: 20 }, defeated: false }]);
    expect(state.enemy.hp).toBe(10);
    expect(outcome.xpByMuscle).toEqual({ chest: 5, triceps: 3, shoulders: 2 });
    expect(state.muscles.chest.xp).toBe(5);
  });

  it('defeats the monster, earns gold and spawns the next one', () => {
    const { state, outcome } = applyWork(createInitialState(), 'crunch', { kind: 'reps', count: 2 }, NOW);
    expect(outcome.hits[1]?.defeated).toBe(true);
    expect(outcome.kills).toEqual([
      { level: 1, stage: 0, boss: false, maxHp: 20, gold: 5, defeatedAt: NOW.toISOString() },
    ]);
    expect(outcome.goldEarned).toBe(5);
    expect(state.gold).toBe(5);
    expect(state.enemy).toEqual(createEnemy(1, 1));
  });

  it('does not carry overkill damage to the next enemy', () => {
    const { state } = applyWork(withLevels(createInitialState(), 10), 'crunch', { kind: 'reps', count: 1 }, NOW);
    expect(state.enemy).toEqual(createEnemy(1, 1));
  });

  it('can clear a whole level, boss included, in one burst', () => {
    const strong = withLevels(createInitialState(), 100); // 1000 damage per hit
    const { state, outcome } = applyWork(strong, 'squat', { kind: 'reps', count: 11 }, NOW);
    expect(outcome.kills).toHaveLength(11);
    expect(outcome.kills[10]?.boss).toBe(true);
    expect(state.enemy).toEqual(createEnemy(2, 0));
    expect(state.gold).toBe(outcome.kills.reduce((s, k) => s + k.gold, 0));
  });

  it('uses levels gained during the set for later hits', () => {
    // Calf raises: 4 XP per rep to calves, level 2 reached at 50 XP = 13 reps.
    const strong = { ...createInitialState(), enemy: { ...createEnemy(50, 0) } };
    const { outcome } = applyWork(strong, 'calf_raise', { kind: 'reps', count: 14 }, NOW);
    expect(outcome.hits[12]?.damage).toBe(10);
    expect(outcome.hits[13]?.damage).toBe(11);
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

  it('ignores empty, negative or invalid input and never mutates the previous state', () => {
    const initial = createInitialState();
    const snapshot = JSON.parse(JSON.stringify(initial));
    expect(applyWork(initial, 'pushup', { kind: 'reps', count: 0 }, NOW).outcome.hits).toHaveLength(0);
    expect(applyWork(initial, 'pushup', { kind: 'reps', count: -3 }, NOW).outcome.amount).toBe(0);
    expect(applyWork(initial, 'pushup', { kind: 'reps', count: Number.NaN }, NOW).outcome.amount).toBe(0);
    applyWork(initial, 'pushup', { kind: 'reps', count: 50 }, NOW);
    expect(initial).toEqual(snapshot);
  });
});
