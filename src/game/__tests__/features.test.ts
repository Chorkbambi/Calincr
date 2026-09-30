import { createEnemy } from '../enemy';
import { applyWork, createInitialState, currentWeeklyBoss, type GameState } from '../engine';
import { applySessionGoal, createDailyQuest } from '../quest';
import { rollWeeklyGoal, setWeeklyGoal } from '../weeklyGoal';
import { seedRecords, trackRecord } from '../records';
import { restoreState } from '../serialization';
import { buyCosmetic, buyGear, buyStreakFreeze, equipCosmetic, equipGear, streakFreezePrice } from '../shop';
import { enemyWeakness, exerciseStyle, gearEffects } from '../styles';
import { exercisesForDifficulty, getExercise } from '../exercises';
import { EXERCISE_STYLES } from '../config';

const NOW = new Date(2026, 2, 10, 12, 0, 0); // Tuesday 2026-03-10
const TODAY = '2026-03-10';

describe('exercise styles and weaknesses', () => {
  it('classifies exercises by their main muscle group', () => {
    expect(exerciseStyle(getExercise('pushup'))).toBe('push');
    expect(exerciseStyle(getExercise('pullup'))).toBe('pull');
    expect(exerciseStyle(getExercise('squat'))).toBe('legs');
    expect(exerciseStyle(getExercise('plank'))).toBe('core');
    expect(exerciseStyle(getExercise('calf_raise'))).toBe('legs');
  });

  it('offers every style in every difficulty mode, so each weakness can be hit', () => {
    for (const d of ['beginner', 'normal', 'advanced'] as const) {
      const styles = new Set(exercisesForDifficulty(d).map(exerciseStyle));
      expect([...styles].sort()).toEqual([...EXERCISE_STYLES].sort());
    }
  });

  it('gives every enemy a stable weakness that changes from one enemy to the next', () => {
    expect(enemyWeakness(1, 0)).toBe(enemyWeakness(1, 0));
    expect(enemyWeakness(1, 0)).not.toBe(enemyWeakness(1, 1));
  });

  it('adds +50% damage on a weakness', () => {
    const state = { ...createInitialState(), enemy: createEnemy(1, 1) }; // weak to Push
    expect(enemyWeakness(1, 1)).toBe('push');
    const { outcome } = applyWork(state, 'pushup', { kind: 'reps', count: 1 }, NOW);
    expect(outcome.hits[0]).toMatchObject({ damage: 15, weak: true });
    const squat = applyWork(state, 'squat', { kind: 'reps', count: 1 }, NOW).outcome;
    expect(squat.hits[0]).toMatchObject({ damage: 10, weak: false });
  });
});

describe('gear', () => {
  const rich = (): GameState => ({ ...createInitialState(), gold: 10_000_000 });

  it('buys and wears armour and rings, one per slot', () => {
    let state = buyGear(rich(), 'leather_armor');
    if ('error' in state) throw new Error(state.error);
    expect(state.state.equippedGear).toEqual({ armor: 'leather_armor', ring: null });
    const ring = buyGear(state.state, 'ring_of_haste');
    if ('error' in ring) throw new Error(ring.error);
    expect(ring.state.equippedGear).toEqual({ armor: 'leather_armor', ring: 'ring_of_haste' });
    expect(buyGear(ring.state, 'ring_of_haste')).toEqual({ error: 'already_owned' });
    expect(equipGear(ring.state, 'ring', 'leather_armor')).toEqual({ error: 'unknown_item' });
    expect(equipGear(ring.state, 'armor', 'chainmail')).toEqual({ error: 'not_owned' });
    const off = equipGear(ring.state, 'armor', null);
    expect('state' in off && off.state.equippedGear.armor).toBeNull();
    expect(buyGear(createInitialState(), 'chainmail')).toEqual({ error: 'not_enough_gold' });
  });

  it('adds gold with armour', () => {
    const base: GameState = { ...createInitialState(), enemy: { ...createEnemy(1, 0), hp: 1 } };
    expect(applyWork(base, 'squat', { kind: 'reps', count: 1 }, NOW).outcome.kills[0]!.gold).toBe(5);
    const armored = { ...base, ownedGear: ['plate_armor' as const], equippedGear: { armor: 'plate_armor' as const, ring: null } };
    expect(applyWork(armored, 'squat', { kind: 'reps', count: 1 }, NOW).outcome.kills[0]!.gold).toBe(8);
  });

  it('keeps a combo alive longer with the Ring of Haste', () => {
    const later = new Date(NOW.getTime() + 12_000);
    const plain = applyWork(createInitialState(), 'squat', { kind: 'reps', count: 1 }, NOW).state;
    expect(applyWork(plain, 'squat', { kind: 'reps', count: 1 }, later).outcome.hits[0]!.combo).toBe(1);
    const ringed = { ...plain, equippedGear: { armor: null, ring: 'ring_of_haste' as const } };
    expect(applyWork(ringed, 'squat', { kind: 'reps', count: 1 }, later).outcome.hits[0]!.combo).toBe(2);
  });

  it('sums the effects of the worn items', () => {
    expect(gearEffects({ armor: 'chainmail', ring: 'hunters_ring' })).toEqual({
      goldBonus: 0.25,
      comboWindowMs: 0,
      comboMaxBonus: 0,
      weaknessBonus: 0.5,
    });
  });
});

describe('cosmetics', () => {
  it('buys, equips and removes cosmetics', () => {
    const bought = buyCosmetic({ ...createInitialState(), gold: 1000 }, 'glow_ember');
    if ('error' in bought) throw new Error(bought.error);
    expect(bought.state.gold).toBe(750);
    expect(bought.state.equippedCosmetics.glow).toBe('glow_ember');
    expect(equipCosmetic(bought.state, 'numbers', 'glow_ember')).toEqual({ error: 'unknown_item' });
    const off = equipCosmetic(bought.state, 'glow', null);
    expect('state' in off && off.state.equippedCosmetics.glow).toBeNull();
  });
});

describe('weekly boss', () => {
  it('starts each week with HP based on the player’s damage and takes every hit', () => {
    const fresh = currentWeeklyBoss(createInitialState(), TODAY);
    expect(fresh).toEqual({ weekStart: '2026-03-09', hp: 3000, maxHp: 3000, defeated: false });
    const { state } = applyWork(createInitialState(), 'squat', { kind: 'reps', count: 2 }, NOW);
    expect(state.weeklyBoss).toEqual({ weekStart: '2026-03-09', hp: 2980, maxHp: 3000, defeated: false });
  });

  it('pays its reward once when defeated', () => {
    const state: GameState = { ...createInitialState(), weeklyBoss: { weekStart: '2026-03-09', hp: 15, maxHp: 3000, defeated: false } };
    const r = applyWork(state, 'squat', { kind: 'reps', count: 3 }, NOW);
    expect(r.outcome.weeklyBossGold).toBe(200);
    expect(r.state.weeklyBoss).toMatchObject({ hp: 0, defeated: true });
    expect(r.state.lifetime.weeklyBosses).toBe(1);
    const again = applyWork(r.state, 'squat', { kind: 'reps', count: 1 }, NOW);
    expect(again.outcome.weeklyBossGold).toBeNull();
  });

  it('is replaced by a new boss the next week', () => {
    const state: GameState = { ...createInitialState(), weeklyBoss: { weekStart: '2026-03-02', hp: 0, maxHp: 3000, defeated: true } };
    expect(currentWeeklyBoss(state, TODAY)).toMatchObject({ weekStart: '2026-03-09', defeated: false });
  });
});

describe('personal records', () => {
  it('only sets the record the first time', () => {
    const { state, record } = trackRecord(createInitialState(), 'pushup', 'set-1', 12);
    expect(record).toBeNull();
    expect(state.records.pushup).toBe(12);
  });

  it('pays once per set when the previous best is beaten', () => {
    let state: GameState = { ...createInitialState(), records: { pushup: 12 } };
    let r = trackRecord(state, 'pushup', 'set-2', 10);
    expect(r.record).toBeNull();
    r = trackRecord(r.state, 'pushup', 'set-2', 13);
    expect(r.record).toEqual({ exerciseId: 'pushup', amount: 13, previous: 12, gold: 20 });
    expect(r.state.gold).toBe(20);
    r = trackRecord(r.state, 'pushup', 'set-2', 15);
    expect(r.record).toBeNull();
    expect(r.state.records.pushup).toBe(15);
    state = r.state;
    expect(trackRecord(state, 'pushup', 'set-3', 16).record?.previous).toBe(15);
  });

  it('seeds records from the history without lowering them', () => {
    const state = { ...createInitialState(), records: { pushup: 20 } };
    expect(seedRecords(state, { pushup: 15, squat: 30 }).records).toEqual({ pushup: 20, squat: 30 });
  });
});

describe('weekly goal', () => {
  // Training on a given local day at noon.
  const train = (state: GameState, day: string) => applyWork(state, 'pushup', { kind: 'reps', count: 5 }, new Date(`${day}T12:00:00`));

  it('pays gold and extends the streak once the week has enough training days', () => {
    let state = setWeeklyGoal(createInitialState(), 2).state;
    let r = train(state, '2026-03-09');
    expect(r.outcome.weeklyGoalGold).toBeNull();
    r = train(r.state, '2026-03-09');
    expect(r.state.weekly.days).toEqual(['2026-03-09']);
    r = train(r.state, '2026-03-11');
    // HP of the level's first monster (20) × 5.
    expect(r.outcome.weeklyGoalGold).toBe(100);
    expect(r.state.weekly).toMatchObject({ streak: 1, best: 1, rewarded: true });
    // Paid once per week.
    r = train(r.state, '2026-03-12');
    expect(r.outcome.weeklyGoalGold).toBeNull();
    state = r.state;
    // Next week: the streak goes on.
    r = train(state, '2026-03-16');
    expect(r.state.weekly).toMatchObject({ weekStart: '2026-03-16', days: ['2026-03-16'], streak: 1, rewarded: false });
    r = train(r.state, '2026-03-18');
    expect(r.state.weekly.streak).toBe(2);
  });

  it('resets the streak after a missed week, unless a freeze covers it', () => {
    const met = { ...createInitialState(), weekly: { weekStart: '2026-03-02', days: ['2026-03-02', '2026-03-04', '2026-03-06'], goal: 3, streak: 5, best: 5, rewarded: true } };
    // Week of March 9 skipped entirely, back on March 16.
    expect(rollWeeklyGoal(met, '2026-03-16')).toMatchObject({ weekly: { streak: 0 }, freezesUsed: 0 });
    expect(rollWeeklyGoal({ ...met, streakFreezes: 1 }, '2026-03-16')).toMatchObject({ weekly: { streak: 5 }, freezesUsed: 1 });
    const r = train({ ...met, streakFreezes: 1 }, '2026-03-16');
    expect(r.state.streakFreezes).toBe(0);
    expect(r.state.weekly.streak).toBe(5);
    // Rest days inside a week never break anything.
    expect(rollWeeklyGoal(met, '2026-03-09').weekly.streak).toBe(5);
  });

  it('clamps the goal between 1 and 7 days', () => {
    expect(setWeeklyGoal(createInitialState(), 0).state.weekly.goal).toBe(1);
    expect(setWeeklyGoal(createInitialState(), 12).state.weekly.goal).toBe(7);
  });
});

describe('session goal and comeback', () => {
  it('scales the quest target, only before the first rep', () => {
    const quest = { ...createDailyQuest(createInitialState(), TODAY, 'normal', [], null), baseTarget: 20, target: 20, baseSets: 2 };
    expect(applySessionGoal(quest, 'short')).toMatchObject({ goal: 'short', target: 10, sets: 2, perSet: 5 });
    expect(applySessionGoal(quest, 'big')).toMatchObject({ goal: 'big', target: 26, sets: 2, perSet: 13 });
    expect(applySessionGoal({ ...quest, progress: 3 }, 'short').target).toBe(20);
  });

  it('gives a lighter quest and bonus gold after 3 days away', () => {
    const base = createDailyQuest(createInitialState(), TODAY, 'normal', [], null);
    expect(base.comeback).toBe(false);
    const away = { ...createInitialState(), lifetime: { ...createInitialState().lifetime, lastActiveDay: '2026-03-06' } };
    const quest = createDailyQuest(away, TODAY, 'normal', [], null);
    expect(quest.comeback).toBe(true);
    expect(quest.target).toBe(Math.round(base.target * 0.8));
    expect(quest.rewardGold).toBe(Math.round(base.rewardGold * 1.5));
    const yesterday = { ...away, lifetime: { ...away.lifetime, lastActiveDay: '2026-03-08' } };
    expect(createDailyQuest(yesterday, TODAY, 'normal', [], null).comeback).toBe(false);
  });
});

describe('streak freeze', () => {
  it('is sold in the shop, two at most', () => {
    let state: GameState = { ...createInitialState(), gold: 1000 };
    expect(streakFreezePrice(state)).toBe(60);
    for (let i = 0; i < 2; i++) {
      const r = buyStreakFreeze(state);
      if ('error' in r) throw new Error(r.error);
      state = r.state;
    }
    expect(state.streakFreezes).toBe(2);
    expect(buyStreakFreeze(state)).toEqual({ error: 'max_owned' });
  });
});

describe('restoring the new fields', () => {
  it('keeps valid values and drops invalid ones', () => {
    const saved = {
      ...createInitialState(),
      ownedGear: ['leather_armor', 'fake'],
      equippedGear: { armor: 'leather_armor', ring: 'ring_of_fury' },
      ownedCosmetics: ['glow_frost'],
      equippedCosmetics: { glow: 'glow_frost', numbers: 'glow_frost' },
      streakFreezes: 99,
      weekly: { weekStart: '2026-03-09', days: ['2026-03-09', 'bad', '2026-03-09'], goal: 40, streak: 3, best: 1, rewarded: true },
      records: { pushup: 20, nope: 3, squat: -1 },
      weeklyBoss: { weekStart: '2026-03-09', hp: 5000, maxHp: 3000 },
    };
    const state = restoreState(JSON.parse(JSON.stringify(saved)));
    expect(state.ownedGear).toEqual(['leather_armor']);
    expect(state.equippedGear).toEqual({ armor: 'leather_armor', ring: null });
    expect(state.equippedCosmetics).toEqual({ glow: 'glow_frost', numbers: null });
    expect(state.streakFreezes).toBe(2);
    expect(state.weekly).toEqual({ weekStart: '2026-03-09', days: ['2026-03-09'], goal: 7, streak: 3, best: 3, rewarded: true });
    expect(restoreState({}).weekly).toMatchObject({ weekStart: '', goal: 3, streak: 0 });
    expect(state.records).toEqual({ pushup: 20 });
    expect(state.weeklyBoss).toEqual({ weekStart: '2026-03-09', hp: 3000, maxHp: 3000, defeated: false });
  });
});
