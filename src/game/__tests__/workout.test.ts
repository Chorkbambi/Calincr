import { createDailyQuest } from '../quest';
import { createInitialState } from '../engine';
import {
  addToWorkout,
  adjustSetAmount,
  clampPlan,
  currentSetAmount,
  currentSetNumber,
  endRest,
  finishSet,
  isSetIdle,
  lastFinishedSet,
  restSecondsLeft,
  startWorkout,
  stopWorkout,
  suggestPlan,
  workoutTotal,
  type Workout,
} from '../workout';
import { restOverPhrase, restStartPhrase, WORKOUT_DONE_PHRASE } from '../voice';

const T0 = 1_000_000;
const plan = { sets: 3, perSet: 10, restSeconds: 60 };

describe('workout plan', () => {
  it('keeps plans inside sensible limits', () => {
    expect(clampPlan('pushup', { sets: 0, perSet: 500, restSeconds: -5 })).toEqual({ sets: 1, perSet: 100, restSeconds: 0 });
    expect(clampPlan('plank', { sets: 3.4, perSet: 900, restSeconds: 90 })).toEqual({ sets: 3, perSet: 600, restSeconds: 90 });
  });

  it('offers the daily quest sets for the quest exercise', () => {
    const quest = { ...createDailyQuest(createInitialState(), '2026-03-10', 'normal', [], null), exerciseId: 'pushup' as const, sets: 3, perSet: 12 };
    expect(suggestPlan('pushup', quest, null, 60)).toEqual({ sets: 3, perSet: 12, restSeconds: 60 });
    // Quest done: back to the last session.
    expect(suggestPlan('pushup', { ...quest, completed: true }, { total: 30, best: 10, sets: 3 }, 0)).toEqual({ sets: 3, perSet: 10, restSeconds: 0 });
  });

  it('repeats the last session, ignoring leftover mini-sets and tiny sets', () => {
    expect(suggestPlan('squat', null, { total: 31, best: 15, sets: 3 }, 90)).toEqual({ sets: 2, perSet: 15, restSeconds: 90 });
    // 2 + 2 + 1 (a quick test): never 3 × 2.
    expect(suggestPlan('squat', null, { total: 5, best: 2, sets: 3 }, 90).perSet).toBe(5);
  });

  it('starts first-timers with a few real sets', () => {
    expect(suggestPlan('pushup', null, null, 60)).toEqual({ sets: 3, perSet: 7, restSeconds: 60 });
    expect(suggestPlan('pullup', null, null, 60)).toEqual({ sets: 2, perSet: 4, restSeconds: 60 });
    expect(suggestPlan('plank', null, null, 60)).toEqual({ sets: 2, perSet: 20, restSeconds: 60 });
  });
});

describe('workout progress', () => {
  it('ends each set by itself at its target, rests, then goes on', () => {
    let w: Workout = startWorkout('pushup', plan);
    let r = addToWorkout(w, 4, T0);
    expect(r.event).toBeNull();
    expect(currentSetAmount(r.workout)).toBe(4);
    r = addToWorkout(r.workout, 6, T0 + 10_000);
    expect(r.event).toBe('setDone');
    w = r.workout;
    expect(w.phase).toBe('rest');
    expect(lastFinishedSet(w)).toEqual({ number: 1, amount: 10 });
    expect(currentSetNumber(w)).toBe(2);
    expect(restSecondsLeft(w, T0 + 10_000 + 15_400)).toBe(45);
    expect(restSecondsLeft(w, T0 + 200_000)).toBe(0);
    // A clock read just before the rest started never shows more than the rest.
    expect(restSecondsLeft(w, T0 + 9_000)).toBe(60);
    w = endRest(w);
    expect(w).toMatchObject({ phase: 'work', amounts: [10, 0] });
    w = addToWorkout(w, 10, T0 + 300_000).workout;
    w = endRest(w);
    r = addToWorkout(w, 12, T0 + 400_000);
    expect(r.event).toBe('done');
    expect(r.workout.amounts).toEqual([10, 10, 12]);
    expect(workoutTotal(r.workout)).toBe(32);
    // Nothing counts once the workout is done.
    expect(addToWorkout(r.workout, 5, T0 + 500_000).event).toBeNull();
  });

  it('starts the next set early when work comes during the rest', () => {
    const w = addToWorkout(startWorkout('pushup', plan), 10, T0).workout;
    expect(addToWorkout(w, 1, T0 + 5_000).workout.amounts).toEqual([10, 1]);
  });

  it('goes straight to the next set without a rest timer', () => {
    const r = addToWorkout(startWorkout('pushup', { ...plan, restSeconds: 0 }), 10, T0);
    expect(r).toMatchObject({ event: 'setDone', workout: { phase: 'work', amounts: [10, 0] } });
    expect(lastFinishedSet(r.workout)).toEqual({ number: 1, amount: 10 });
    expect(lastFinishedSet(startWorkout('pushup', plan))).toBeNull();
  });

  it('lets the player end a set early, never an empty one', () => {
    const w = startWorkout('pushup', plan);
    expect(finishSet(w, T0).event).toBeNull();
    const r = finishSet(addToWorkout(w, 7, T0).workout, T0);
    expect(r).toMatchObject({ event: 'setDone', workout: { phase: 'rest', amounts: [7] } });
  });

  it('notices a set where nothing has been counted for a while', () => {
    const w = addToWorkout(startWorkout('pushup', plan), 3, T0).workout;
    expect(isSetIdle(w, T0 + 19_000)).toBe(false);
    expect(isSetIdle(w, T0 + 20_000)).toBe(true);
    expect(isSetIdle(startWorkout('pushup', plan), T0 + 99_000)).toBe(false);
  });

  it('stops where it is, keeping the sets with something in them', () => {
    const w = addToWorkout(endRest(addToWorkout(startWorkout('pushup', plan), 10, T0).workout), 0, T0).workout;
    expect(stopWorkout(w)).toMatchObject({ amounts: [10], workout: { phase: 'done' } });
  });

  it('corrects counts on the review screen without going below zero', () => {
    expect(adjustSetAmount('pushup', 2, -5)).toBe(0);
    expect(adjustSetAmount('pushup', 9, 1)).toBe(10);
  });
});

describe('workout voice', () => {
  it('announces the rest and the next set', () => {
    expect(restStartPhrase(1, 3, 60)).toBe('Set 1 done. Rest, 1 minute.');
    expect(restStartPhrase(2, 3, 90)).toBe('Set 2 done. Rest, 90 seconds.');
    expect(restStartPhrase(2, 3, 0)).toBe('Set 2 done. Last set, go!');
    expect(restOverPhrase(2, 3)).toBe('Rest over. Set 2 of 3, go!');
    expect(restOverPhrase(3, 3)).toBe('Rest over. Last set, go!');
    expect(WORKOUT_DONE_PHRASE).toMatch(/complete/);
  });
});
