import { ACHIEVEMENTS, achievementGold, checkAchievements } from '../achievements';
import { applyWork, createInitialState } from '../engine';
import { applyQuestReward, createDailyQuest } from '../quest';
import { weeklyRecap } from '../recap';
import { restoreState } from '../serialization';
import type { SetRecord } from '../sets';

describe('achievements', () => {
  it('have unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('unlock once, with a gold reward', () => {
    const { state } = applyWork(createInitialState(), 'crunch', { kind: 'reps', count: 2 }, new Date(2026, 2, 10));
    const goldBefore = state.gold;
    const first = checkAchievements(state);
    expect(first.unlocked.map((u) => u.id)).toEqual(['first_blood']);
    expect(first.state.gold).toBe(goldBefore + achievementGold(state, 1));
    expect(checkAchievements(first.state).unlocked).toEqual([]);
  });

  it('track quests and streaks', () => {
    const state = createInitialState();
    const quest = { ...createDailyQuest(state, '2026-03-10', 'normal', [], null), streak: 6 };
    const rewarded = applyQuestReward(state, quest).state;
    expect(rewarded.lifetime).toMatchObject({ questsCompleted: 1, bestQuestStreak: 7 });
    const ids = checkAchievements(rewarded).unlocked.map((u) => u.id);
    expect(ids).toEqual(expect.arrayContaining(['quest_taker', 'unbreakable']));
  });

  it('are saved and restored (unknown ids dropped)', () => {
    const state = { ...createInitialState(), achievements: ['first_blood', 'made_up'] };
    expect(restoreState(JSON.parse(JSON.stringify(state))).achievements).toEqual(['first_blood']);
  });
});

describe('weeklyRecap', () => {
  const set = (day: string, exerciseId: SetRecord['exerciseId'], amount: number, xp: SetRecord['xpByMuscle']): SetRecord => ({
    id: `${day}-${exerciseId}`,
    startedAt: `${day}T10:00:00.000Z`,
    updatedAt: `${day}T10:00:00.000Z`,
    day,
    exerciseId,
    amount,
    xpByMuscle: xp,
    multiplierByMuscle: {},
    damage: 0,
    hits: amount,
  });

  it('summarises the week', () => {
    const sets = [
      set('2026-09-21', 'pushup', 30, { chest: 150, triceps: 90 }),
      set('2026-09-23', 'squat', 40, { quads: 160 }),
      set('2026-09-23', 'plank', 60, { abs: 84 }),
      set('2026-09-28', 'pushup', 99, { chest: 500 }), // next week
    ];
    const kill = (day: string, boss: boolean) => ({ level: 1, stage: boss ? 10 : 0, boss, maxHp: 20, gold: 5, defeatedAt: `${day}T12:00:00.000Z` });
    const recap = weeklyRecap('2026-09-21', sets, [kill('2026-09-22', false), kill('2026-09-24', true), kill('2026-09-29', false)], (iso) => iso.slice(0, 10));
    expect(recap).toEqual({
      weekStart: '2026-09-21',
      activeDays: 2,
      reps: 70,
      holdSeconds: 60,
      kills: 2,
      bosses: 1,
      topExercise: { exerciseId: 'squat', amount: 40 }, // 60 s of plank = 12 hits of effort
      topMuscle: 'quads',
    });
  });
});
