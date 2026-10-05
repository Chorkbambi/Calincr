import { VOICE, type ExerciseUnit } from './config';

/**
 * What the voice count says after some work: the set's new rep total ("12"),
 * or for holds the elapsed seconds each time a step is crossed ("30 seconds").
 * A burst of several reps at once only says the final total. Null = say nothing.
 */
export function voiceCountPhrase(unit: ExerciseUnit, previous: number, current: number): string | null {
  if (current <= previous) return null;
  if (unit === 'reps') return String(Math.floor(current));
  const step = VOICE.holdStepSeconds;
  const reached = Math.floor(current / step);
  return reached > Math.floor(previous / step) ? `${reached * step} seconds` : null;
}

export const REST_OVER_PHRASE = 'Rest over. Next set!';

const seconds = (n: number) => (n % 60 === 0 ? `${n / 60} minute${n === 60 ? '' : 's'}` : `${n} seconds`);

/** Said when a set ends by itself (target reached or the player stopped): the rest starts. */
export function restStartPhrase(setNumber: number, totalSets: number, restSeconds: number): string {
  const next = setNumber + 1 === totalSets ? 'Last set' : `Set ${setNumber + 1}`;
  return restSeconds > 0 ? `Set ${setNumber} done. Rest, ${seconds(restSeconds)}.` : `Set ${setNumber} done. ${next}, go!`;
}

/** Said when the rest is over: which set comes next. */
export function restOverPhrase(nextSet: number, totalSets: number): string {
  return nextSet === totalSets ? 'Rest over. Last set, go!' : `Rest over. Set ${nextSet} of ${totalSets}, go!`;
}

export const WORKOUT_DONE_PHRASE = 'Exercise complete. Well done!';
