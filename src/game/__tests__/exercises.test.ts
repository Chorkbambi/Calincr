import { EXERCISES, MUSCLE_IDS } from '../config';
import { getExercise, muscleWeights, splitXp } from '../exercises';

describe('exercise catalog', () => {
  it.each(EXERCISES.map((e) => [e.id, e] as const))('%s has weights summing to 1.0', (_id, exercise) => {
    const total = muscleWeights(exercise).reduce((s, [, w]) => s + w, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it('only references known muscles', () => {
    for (const exercise of EXERCISES) {
      for (const [muscle] of muscleWeights(exercise)) expect(MUSCLE_IDS).toContain(muscle);
    }
  });

  it('has a positive base XP and unique ids', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const exercise of EXERCISES) expect(exercise.baseXp).toBeGreaterThan(0);
  });

  it('measures plank in seconds and everything else in reps', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.unit).toBe(exercise.id === 'plank' ? 'seconds' : 'reps');
    }
  });
});

describe('splitXp', () => {
  it('splits push-up XP 0.5 / 0.3 / 0.2 across chest, triceps, shoulders', () => {
    const pushup = getExercise('pushup');
    const xp = splitXp(pushup, 10);
    const total = pushup.baseXp * 10;
    expect(xp.chest).toBeCloseTo(total * 0.5);
    expect(xp.triceps).toBeCloseTo(total * 0.3);
    expect(xp.shoulders).toBeCloseTo(total * 0.2);
    expect(Object.keys(xp).sort()).toEqual(['chest', 'shoulders', 'triceps']);
  });

  it('gives all calf-raise XP to calves', () => {
    const calf = getExercise('calf_raise');
    expect(splitXp(calf, 3)).toEqual({ calves: calf.baseXp * 3 });
  });

  it('never loses XP in the split', () => {
    for (const exercise of EXERCISES) {
      const total = Object.values(splitXp(exercise, 7)).reduce((s, v) => s + (v ?? 0), 0);
      expect(total).toBeCloseTo(exercise.baseXp * 7);
    }
  });
});
