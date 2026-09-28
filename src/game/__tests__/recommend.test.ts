import type { MuscleId } from '../config';
import { applyWork, createInitialState, type GameState } from '../engine';
import { recommendExercises } from '../recommend';

const TODAY = '2026-03-10';

/** Marks muscles as last trained on `day` (streak 1). */
function trainedOn(state: GameState, day: string, muscles: MuscleId[]): GameState {
  const next = { ...state, muscles: { ...state.muscles } };
  for (const m of muscles) next.muscles[m] = { ...next.muscles[m], lastTrainedDay: day, streakDays: 1 };
  return next;
}

describe('recommendExercises', () => {
  it('ranks the exercises of the mode, all at ×1 on a fresh game (highest XP per rep first)', () => {
    const ranking = recommendExercises(createInitialState(), TODAY, 'advanced');
    expect(ranking).toHaveLength(21);
    expect(ranking.every((r) => r.effectiveMultiplier === 1)).toBe(true);
    expect(ranking[0]?.exerciseId).toBe('pistol_squat');
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

  it('stays the same all day after training', () => {
    const state = trainedOn(createInitialState(), '2026-03-06', ['abs']);
    const morning = recommendExercises(state, TODAY, 'normal')[0];
    const after = applyWork(state, 'crunch', { kind: 'reps', count: 20 }, new Date(2026, 2, 10, 9));
    expect(recommendExercises(after.state, TODAY, 'normal')[0]).toEqual(morning);
  });
});
