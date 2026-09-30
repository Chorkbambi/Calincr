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
