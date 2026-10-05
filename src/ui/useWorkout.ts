import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addToWorkout,
  currentSetAmount,
  endRest,
  finishSet as finishWorkoutSet,
  getExercise,
  isSetIdle,
  lastFinishedSet,
  restOverPhrase,
  restSecondsLeft,
  restStartPhrase,
  startWorkout,
  stopWorkout,
  voiceCountPhrase,
  WORKOUT_DONE_PHRASE,
  type ExerciseId,
  type Workout,
  type WorkoutEvent,
  type WorkoutPlan,
} from '../game';
import { say } from './voice';

const TICK_MS = 250;

export interface WorkoutControls {
  /** The exercise in progress (null = none). */
  workout: Workout | null;
  /** Latest workout, also inside callbacks of the same frame. */
  current(): Workout | null;
  start(exerciseId: ExerciseId, plan: WorkoutPlan): void;
  /** Counts work in the set in progress; the set ends by itself at its target. */
  add(amount: number): WorkoutEvent;
  /** The player ends the set in progress before its target. */
  finishSet(): void;
  skipRest(): void;
  /** Stops where it is and returns the sets that have something in them. */
  stop(): number[];
  reset(): void;
}

/**
 * Drives an exercise set after set: ends a set at its target (or, with `autoEndWhenIdle`, when nothing is counted
 * for a while), runs the rest countdown, starts the next set, and says it all out loud when the voice is on.
 */
export function useWorkout({
  voice,
  autoEndWhenIdle,
  onSetDone,
  onDone,
}: {
  voice: boolean;
  /** Camera: the player can't reach the phone, so a set with no new rep for a while ends by itself. */
  autoEndWhenIdle: boolean;
  /** A set just ended (the rest starts). */
  onSetDone: (workout: Workout) => void;
  /** The last set just ended. */
  onDone: (workout: Workout) => void;
}): WorkoutControls {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const ref = useRef<Workout | null>(null);
  const latest = useRef({ voice, autoEndWhenIdle, onSetDone, onDone });
  latest.current = { voice, autoEndWhenIdle, onSetDone, onDone };

  const commit = useCallback((next: Workout | null) => {
    ref.current = next;
    setWorkout(next);
  }, []);

  /** Saves the new workout, says what happened (`count` = the rep count to say first) and calls back. */
  const apply = useCallback(
    (next: Workout, event: WorkoutEvent, count: string | null) => {
      commit(next);
      const finished = lastFinishedSet(next);
      let phrase = count;
      if (event === 'done') phrase = [count, WORKOUT_DONE_PHRASE].filter(Boolean).join('. ');
      else if (event === 'setDone' && finished) {
        phrase = [count, restStartPhrase(finished.number, next.plan.sets, next.plan.restSeconds)].filter(Boolean).join('. ');
      }
      if (phrase && latest.current.voice) say(phrase);
      if (event === 'setDone') latest.current.onSetDone(next);
      if (event === 'done') latest.current.onDone(next);
    },
    [commit],
  );

  const start = useCallback(
    (exerciseId: ExerciseId, plan: WorkoutPlan) => {
      commit(startWorkout(exerciseId, plan));
    },
    [commit],
  );

  const add = useCallback(
    (amount: number): WorkoutEvent => {
      const current = ref.current;
      if (!current) return null;
      const before = currentSetAmount(current);
      const { workout: next, event } = addToWorkout(current, amount, Date.now());
      if (next === current) return null;
      const after = event === null ? currentSetAmount(next) : (lastFinishedSet(next)?.amount ?? 0);
      apply(next, event, voiceCountPhrase(getExercise(next.exerciseId).unit, before, after));
      return event;
    },
    [apply],
  );

  const finishSet = useCallback(() => {
    const current = ref.current;
    if (!current) return;
    const { workout: next, event } = finishWorkoutSet(current, Date.now());
    if (event) apply(next, event, null);
  }, [apply]);

  const skipRest = useCallback(() => {
    if (ref.current?.phase === 'rest') commit(endRest(ref.current));
  }, [commit]);

  const stop = useCallback((): number[] => {
    const current = ref.current;
    commit(null);
    return current ? stopWorkout(current).amounts : [];
  }, [commit]);

  const reset = useCallback(() => commit(null), [commit]);
  const current = useCallback(() => ref.current, []);

  // Rest countdown, and (camera) the end of a set nobody is doing any more.
  const phase = workout?.phase ?? null;
  useEffect(() => {
    if (phase === null || phase === 'done') return undefined;
    const timer = setInterval(() => {
      const t = Date.now();
      const w = ref.current;
      if (!w) return;
      if (w.phase === 'rest') {
        if (restSecondsLeft(w, t) > 0) return;
        const next = endRest(w);
        commit(next);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (latest.current.voice) say(restOverPhrase(next.amounts.length, next.plan.sets));
      } else if (latest.current.autoEndWhenIdle && isSetIdle(w, t)) {
        const { workout: next, event } = finishWorkoutSet(w, t);
        if (event) apply(next, event, null);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase, commit, apply]);

  return { workout, current, start, add, finishSet, skipRest, stop, reset };
}
