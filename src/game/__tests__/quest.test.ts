import type { MuscleId } from '../config';
import { applyWork, createInitialState, type GameState } from '../engine';
import {
  applyQuestReward,
  createDailyQuest,
  progressQuest,
  questNeedsRefresh,
  questTarget,
  restoreQuest,
  splitIntoSets,
  type DailyQuest,
} from '../quest';
import type { SetRecord } from '../sets';

const TODAY = '2026-03-10';

const set = (day: string, exerciseId: SetRecord['exerciseId'], amount: number): SetRecord => ({
  id: `${day}-${exerciseId}-${amount}`,
  startedAt: `${day}T10:00:00.000Z`,
  updatedAt: `${day}T10:00:00.000Z`,
  day,
  exerciseId,
  amount,
  xpByMuscle: {},
  multiplierByMuscle: {},
  damage: 0,
  hits: amount,
});

function trainedOn(state: GameState, day: string, muscles: MuscleId[]): GameState {
  const next = { ...state, muscles: { ...state.muscles } };
  for (const m of muscles) next.muscles[m] = { ...next.muscles[m], lastTrainedDay: day, streakDays: 1 };
  return next;
}

describe('questTarget', () => {
  it('starts from a default target the first time', () => {
    expect(questTarget('pushup', [], TODAY, 1)).toEqual({ target: 15, lastDone: null });
    expect(questTarget('pullup', [], TODAY, 1).target).toBe(8);
    expect(questTarget('plank', [], TODAY, 1).target).toBe(40);
  });

  it('builds on the last session with a small progression', () => {
    const history = [set('2026-03-01', 'pushup', 30), set('2026-03-07', 'pushup', 12), set('2026-03-07', 'pushup', 8)];
    // Last session: 20 reps on March 7 → 20 + 10% = 22.
    expect(questTarget('pushup', history, TODAY, 1)).toEqual({ target: 22, lastDone: { day: '2026-03-07', amount: 20 } });
  });

  it('adds at least the minimum step', () => {
    expect(questTarget('pushup', [set('2026-03-08', 'pushup', 5)], TODAY, 1).target).toBe(6);
    expect(questTarget('plank', [set('2026-03-08', 'plank', 30)], TODAY, 1).target).toBe(35);
  });

  it('restarts lower after a long break and lighter when muscles are tired', () => {
    expect(questTarget('pushup', [set('2026-02-25', 'pushup', 30)], TODAY, 1).target).toBe(24);
    expect(questTarget('pushup', [set('2026-03-08', 'pushup', 20)], TODAY, 0.7).target).toBe(15);
  });

  it('ignores today and other exercises', () => {
    const history = [set(TODAY, 'pushup', 50), set('2026-03-08', 'squat', 40)];
    expect(questTarget('pushup', history, TODAY, 1).lastDone).toBeNull();
  });
});

describe('splitIntoSets', () => {
  it('splits the target into a few sets', () => {
    expect(splitIntoSets(30, 'reps')).toEqual({ sets: 4, perSet: 8 });
    expect(splitIntoSets(15, 'reps')).toEqual({ sets: 3, perSet: 5 });
    expect(splitIntoSets(5, 'reps')).toEqual({ sets: 1, perSet: 5 });
    expect(splitIntoSets(45, 'seconds')).toEqual({ sets: 2, perSet: 23 });
  });
});

describe('createDailyQuest', () => {
  it('suggests the exercise of the most rested muscles, with its target and reward', () => {
    let state = trainedOn(createInitialState(), '2026-03-09', ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'calves']);
    state = trainedOn(state, '2026-03-06', ['glutes', 'hamstrings']);
    const quest = createDailyQuest(state, TODAY, 'normal', [set('2026-03-06', 'single_leg_bridge', 10)], null);
    expect(quest.exerciseId).toBe('single_leg_bridge');
    expect(quest.target).toBe(11);
    expect(quest.effectiveMultiplier).toBeCloseTo(1.5);
    expect(quest).toMatchObject({ day: TODAY, progress: 0, completed: false, streak: 0, sets: 2, perSet: 6 });
    expect(quest.rewardXp).toBe(Math.round(11 * 9 * 0.5));
    expect(quest.rewardGold).toBe(30);
  });

  it('keeps the streak going only after a quest completed yesterday', () => {
    const state = createInitialState();
    const yesterday = { ...createDailyQuest(state, '2026-03-09', 'normal', [], null), completed: true, streak: 2 };
    expect(createDailyQuest(state, TODAY, 'normal', [], yesterday).streak).toBe(3);
    expect(createDailyQuest(state, TODAY, 'normal', [], { ...yesterday, completed: false }).streak).toBe(0);
    expect(createDailyQuest(state, '2026-03-11', 'normal', [], yesterday).streak).toBe(0);
  });

  it('is refreshed on a new day, or when its exercise leaves the difficulty mode untouched', () => {
    const quest = createDailyQuest(createInitialState(), TODAY, 'normal', [], null);
    expect(questNeedsRefresh(null, TODAY, 'normal')).toBe(true);
    expect(questNeedsRefresh(quest, TODAY, 'normal')).toBe(false);
    expect(questNeedsRefresh(quest, '2026-03-11', 'normal')).toBe(true);
    expect(questNeedsRefresh(quest, TODAY, 'beginner')).toBe(true);
    expect(questNeedsRefresh({ ...quest, progress: 3 }, TODAY, 'beginner')).toBe(false);
  });
});

describe('quest progress and reward', () => {
  const now = new Date(2026, 2, 10, 9);
  const base = (): DailyQuest => ({ ...createDailyQuest(createInitialState(), TODAY, 'normal', [], null), exerciseId: 'pushup', target: 10 });

  it('counts only the quest exercise, today, and completes once', () => {
    let quest = base();
    const state = createInitialState();
    const other = applyWork(state, 'squat', { kind: 'reps', count: 20 }, now).outcome;
    expect(progressQuest(quest, other).quest.progress).toBe(0);
    const first = progressQuest(quest, applyWork(state, 'pushup', { kind: 'reps', count: 6 }, now).outcome);
    expect(first).toMatchObject({ justCompleted: false, quest: { progress: 6, completed: false } });
    quest = first.quest;
    const second = progressQuest(quest, applyWork(state, 'pushup', { kind: 'reps', count: 6 }, now).outcome);
    expect(second).toMatchObject({ justCompleted: true, quest: { progress: 12, completed: true } });
    expect(progressQuest(second.quest, applyWork(state, 'pushup', { kind: 'reps', count: 1 }, now).outcome).justCompleted).toBe(false);
  });

  it('gives bonus gold and XP to the exercise muscles', () => {
    const quest = { ...base(), rewardXp: 100, rewardGold: 40 };
    const { state } = applyQuestReward(createInitialState(), quest);
    expect(state.gold).toBe(40);
    // Push-ups: chest 50% → 50 XP = level 2 exactly.
    expect(state.muscles.chest).toMatchObject({ level: 2, xp: 0 });
    expect(state.muscles.triceps.xp).toBeCloseTo(30);
    expect(state.muscles.back.xp).toBe(0);
  });

  it('restores a stored quest and rejects garbage', () => {
    const quest = base();
    expect(restoreQuest(JSON.parse(JSON.stringify(quest)))).toEqual(quest);
    expect(restoreQuest({ ...quest, exerciseId: 'teleport' })).toBeNull();
    expect(restoreQuest({ ...quest, completed: true, progress: 0 })?.completed).toBe(false);
    expect(restoreQuest(null)).toBeNull();
  });
});
