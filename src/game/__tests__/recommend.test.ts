import type { MuscleId } from '../config';
import { applyWork, createInitialState, type GameState } from '../engine';
import { groupRestScore, recommendExercises, sortForBattle, todayFocus } from '../recommend';

const TODAY = '2026-03-10';

/** Marks muscles as last trained on `day` (streak 1). */
function trainedOn(state: GameState, day: string, muscles: MuscleId[]): GameState {
  const next = { ...state, muscles: { ...state.muscles } };
  for (const m of muscles) next.muscles[m] = { ...next.muscles[m], lastTrainedDay: day, streakDays: 1 };
  return next;
}

describe('recommendExercises', () => {
  it('ranks the exercises of the mode, all at ×1 on a fresh game (first group, highest XP per rep first)', () => {
    const ranking = recommendExercises(createInitialState(), TODAY, 'advanced');
    expect(ranking).toHaveLength(21);
    expect(ranking.every((r) => r.effectiveMultiplier === 1)).toBe(true);
    expect(ranking[0]?.exerciseId).toBe('dip');
    expect(ranking[0]?.style).toBe('push');
  });

  it('keeps the exercises of a group together (no mix of everything)', () => {
    const styles = recommendExercises(createInitialState(), TODAY, 'advanced').map((r) => r.style);
    const groups = styles.filter((s, i) => s !== styles[i - 1]);
    expect(groups).toEqual(['push', 'pull', 'legs', 'core']);
  });

  it('suggests the least recently trained group', () => {
    // Push yesterday, pull 2 days ago, legs 4 days ago, core 3 days ago.
    let state = trainedOn(createInitialState(), '2026-03-09', ['chest', 'triceps', 'shoulders']);
    state = trainedOn(state, '2026-03-08', ['back', 'biceps']);
    state = trainedOn(state, '2026-03-06', ['quads', 'glutes', 'hamstrings', 'calves']);
    state = trainedOn(state, '2026-03-07', ['abs']);
    const ranking = recommendExercises(state, TODAY, 'normal');
    expect(ranking[0]?.style).toBe('legs');
    expect(ranking.map((r) => r.style).filter((s, i, all) => s !== all[i - 1])).toEqual(['legs', 'core', 'pull', 'push']);
  });

  it('counts a never trained muscle as fully rested', () => {
    const state = trainedOn(createInitialState(), '2026-03-06', ['abs']);
    expect(groupRestScore(state, 'core', TODAY)).toBeCloseTo(1.5);
    expect(groupRestScore(state, 'legs', TODAY)).toBeCloseTo(1.5);
    const yesterday = trainedOn(createInitialState(), '2026-03-09', ['back']);
    expect(groupRestScore(yesterday, 'pull', TODAY)).toBeCloseTo((0.7 + 1.5) / 2);
  });

  it('keeps suggesting the group already trained today, even if another one is more rested', () => {
    // Chest day today: legs are far more rested, but the player stays on push for the day.
    let state = trainedOn(createInitialState(), '2026-03-06', ['quads', 'glutes', 'hamstrings', 'calves', 'back', 'biceps', 'abs']);
    state = trainedOn(state, '2026-03-08', ['chest', 'triceps', 'shoulders']);
    state = applyWork(state, 'pushup', { kind: 'reps', count: 20 }, new Date(2026, 2, 10, 9)).state;
    const focus = todayFocus({ pushup: { day: TODAY, amount: 20 } }, TODAY);
    expect(focus).toBe('push');
    const ranking = recommendExercises(state, TODAY, 'normal', focus);
    // Normal mode has three push exercises: all of them first.
    expect(ranking.slice(0, 3).map((r) => r.style)).toEqual(['push', 'push', 'push']);
    // Without the day's focus, the rested legs would come first.
    expect(recommendExercises(state, TODAY, 'normal')[0]?.style).not.toBe('push');
  });

  it('suggests the exercise that works the rested muscles', () => {
    // Everything trained yesterday (tired) except glutes and hamstrings, rested for 4 days.
    let state = trainedOn(createInitialState(), '2026-03-09', ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'calves']);
    state = trainedOn(state, '2026-03-06', ['glutes', 'hamstrings']);
    const [best] = recommendExercises(state, TODAY, 'beginner');
    expect(best?.exerciseId).toBe('glute_bridge');
    expect(best?.effectiveMultiplier).toBeCloseTo(1.5);
    expect(best?.muscles.map((m) => m.muscle)).toEqual(['glutes', 'hamstrings']);
  });

  it('prefers an exercise hitting two rested muscles over one with a single rested muscle', () => {
    // abs and quads rested (×1.5), the rest trained yesterday (×0.7).
    let state = trainedOn(createInitialState(), '2026-03-09', ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'glutes', 'hamstrings', 'calves']);
    state = trainedOn(state, '2026-03-06', ['abs', 'quads']);
    const ranking = recommendExercises(state, TODAY, 'advanced');
    const top = ranking.slice(0, 3).map((r) => r.exerciseId);
    // Leg raises and hanging leg raises (abs 0.8 + quads 0.2) are fully rested: ×1.5.
    expect(top.slice(0, 2).sort()).toEqual(['hanging_leg_raise', 'leg_raise']);
    // Hanging leg raises give more XP per rep, so they win the tie.
    expect(ranking[0]?.exerciseId).toBe('hanging_leg_raise');
    const pushups = ranking.find((r) => r.exerciseId === 'pushup');
    expect(pushups?.effectiveMultiplier).toBeCloseTo(0.7);
  });

  it('stays the same all day after training the suggested group', () => {
    // Abs rested for 4 days, everything else trained 2 days ago (×1).
    let state = trainedOn(createInitialState(), '2026-03-08', ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'glutes', 'hamstrings', 'calves']);
    state = trainedOn(state, '2026-03-06', ['abs']);
    const morning = recommendExercises(state, TODAY, 'beginner')[0];
    expect(morning?.exerciseId).toBe('crunch');
    const after = applyWork(state, 'crunch', { kind: 'reps', count: 20 }, new Date(2026, 2, 10, 9));
    const focus = todayFocus({ crunch: { day: TODAY, amount: 20 } }, TODAY);
    expect(recommendExercises(after.state, TODAY, 'beginner', focus)[0]).toEqual(morning);
  });
});

describe('todayFocus', () => {
  it('is the group with the most XP done today, ignoring older days', () => {
    expect(todayFocus({}, TODAY)).toBeNull();
    expect(todayFocus({ squat: { day: '2026-03-09', amount: 100 } }, TODAY)).toBeNull();
    // 10 push-ups = 100 XP of push; 5 leg raises = 45 XP, 30 crunches = 150 XP of core.
    expect(todayFocus({ pushup: { day: TODAY, amount: 10 }, leg_raise: { day: TODAY, amount: 5 } }, TODAY)).toBe('push');
    expect(todayFocus({ pushup: { day: TODAY, amount: 10 }, crunch: { day: TODAY, amount: 30 } }, TODAY)).toBe('core');
    expect(todayFocus({ not_an_exercise: { day: TODAY, amount: 99 } }, TODAY)).toBeNull();
  });
});

describe('sortForBattle', () => {
  it('puts favourites first, then the exercises hitting the weakness (more damage), then the suggestions', () => {
    const ranking = recommendExercises(createInitialState(), TODAY, 'normal');
    const order = sortForBattle(ranking, 'legs', ['plank']);
    expect(order[0]).toBe('plank');
    const legs = ['squat', 'lunge', 'single_leg_bridge', 'single_leg_calf_raise'];
    expect(order.slice(1, 5).sort()).toEqual([...legs].sort());
    expect(order).toHaveLength(ranking.length);
    // The rest keeps the suggestion order.
    const rest = ranking.map((r) => r.exerciseId).filter((id) => id !== 'plank' && !legs.includes(id));
    expect(order.slice(5)).toEqual(rest);
  });
});
