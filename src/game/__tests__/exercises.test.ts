import { EXERCISES, MUSCLE_IDS } from '../config';
import { exercisesForDifficulty, exercisesForMuscle, getExercise, muscleWeights, splitXp } from '../exercises';
import { EXERCISE_GUIDES } from '../guides';

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

  it('measures holds in seconds and everything else in reps', () => {
    const timed = EXERCISES.filter((e) => e.unit === 'seconds').map((e) => e.id);
    expect(timed.sort()).toEqual(['hollow_hold', 'knee_plank', 'plank']);
  });

  it.each(['beginner', 'normal', 'advanced'] as const)('covers all 10 muscles in %s mode', (difficulty) => {
    const worked = new Set(exercisesForDifficulty(difficulty).flatMap((e) => muscleWeights(e).map(([m]) => m)));
    expect([...worked].sort()).toEqual([...MUSCLE_IDS].sort());
  });

  it('has a guide for every exercise', () => {
    for (const exercise of EXERCISES) {
      const guide = EXERCISE_GUIDES[exercise.id];
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.tip).not.toBe('');
      expect(guide.camera).not.toBe('');
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

describe('difficulty modes', () => {
  it('shows simplified exercises to beginners and hard ones only in advanced mode', () => {
    const ids = (d: 'beginner' | 'normal' | 'advanced') => exercisesForDifficulty(d).map((e) => e.id);
    expect(ids('beginner')).toContain('wall_pushup');
    expect(ids('beginner')).not.toContain('pushup');
    expect(ids('normal')).toContain('pushup');
    expect(ids('normal')).not.toContain('pullup');
    expect(ids('advanced')).toEqual(expect.arrayContaining(['pushup', 'pullup']));
    expect(ids('advanced')).not.toContain('wall_pushup');
  });

  it('lists exercises for a muscle, biggest share first', () => {
    const forGlutes = exercisesForMuscle('glutes', 'normal');
    expect(forGlutes[0]?.exercise.id).toBe('single_leg_bridge');
    expect(forGlutes.every((e) => e.weight > 0)).toBe(true);
    expect(forGlutes.map((e) => e.weight)).toEqual([...forGlutes.map((e) => e.weight)].sort((a, b) => b - a));
    expect(exercisesForMuscle('biceps', 'advanced')[0]?.exercise.id).toBe('chinup');
  });
});
