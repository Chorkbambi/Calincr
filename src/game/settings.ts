import { MANUAL_INPUT, REST_TIMER_CHOICES, type Difficulty, type ExerciseId } from './config';
import { isExerciseId } from './exercises';

export type InputMode = 'camera' | 'manual';

/** Bump when the first-launch flow gains new steps: players who saw an older version see it again. */
export const ONBOARDING_VERSION = 2;

export interface Settings {
  inputMode: InputMode;
  difficulty: Difficulty;
  /** Manual mode: reps added by one press of the Rep button. */
  repsPerPress: number;
  /** Version of the first-launch flow the player has completed (0 = never). */
  onboardingVersion: number;
  /** Camera mode: show only the skeleton on black, not the video image. */
  hideCameraImage: boolean;
  /** Rest timer after each set, in seconds (0 = off). */
  restTimerSeconds: number;
  /** Local daily reminder (no server). */
  reminder: { enabled: boolean; hour: number; minute: number };
  /** Exercises pinned at the start of the list. */
  favorites: ExerciseId[];
  /** Bigger buttons during the fight. */
  largeButtons: boolean;
  /** Voice counts the reps of the set out loud and says when the rest is over (phone's own voice, offline). */
  voiceCount: boolean;
  /** Ask each day how long the session will be (short / normal / big), before the daily quest. */
  askSessionGoal: boolean;
  /** Monday of the last week whose recap was shown. */
  lastRecapWeek: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  inputMode: 'camera',
  difficulty: 'normal',
  repsPerPress: 1,
  onboardingVersion: 0,
  hideCameraImage: false,
  restTimerSeconds: 0,
  reminder: { enabled: false, hour: 18, minute: 0 },
  favorites: [],
  largeButtons: false,
  voiceCount: false,
  askSessionGoal: true,
  lastRecapWeek: null,
};

export function clampRepsPerPress(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.repsPerPress;
  return Math.min(MANUAL_INPUT.maxRepsPerPress, Math.max(MANUAL_INPUT.minRepsPerPress, Math.round(value)));
}

const intIn = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback;

/** Rebuilds valid settings from stored JSON. */
export function restoreSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS, reminder: { ...DEFAULT_SETTINGS.reminder } };
  const r = raw as Record<string, unknown>;
  const reminder = (typeof r.reminder === 'object' && r.reminder !== null ? r.reminder : {}) as Record<string, unknown>;
  // Saves from before onboarding versions had a boolean `onboarded`.
  const onboardingVersion =
    typeof r.onboardingVersion === 'number' ? intIn(r.onboardingVersion, 0, 1000, 0) : r.onboarded === true ? 1 : 0;
  return {
    inputMode: r.inputMode === 'manual' || r.inputMode === 'camera' ? r.inputMode : DEFAULT_SETTINGS.inputMode,
    difficulty:
      r.difficulty === 'beginner' || r.difficulty === 'normal' || r.difficulty === 'advanced'
        ? r.difficulty
        : DEFAULT_SETTINGS.difficulty,
    repsPerPress: typeof r.repsPerPress === 'number' ? clampRepsPerPress(r.repsPerPress) : DEFAULT_SETTINGS.repsPerPress,
    onboardingVersion,
    hideCameraImage: r.hideCameraImage === true,
    restTimerSeconds: (REST_TIMER_CHOICES as readonly number[]).includes(r.restTimerSeconds as number)
      ? (r.restTimerSeconds as number)
      : DEFAULT_SETTINGS.restTimerSeconds,
    reminder: {
      enabled: reminder.enabled === true,
      hour: intIn(reminder.hour, 0, 23, DEFAULT_SETTINGS.reminder.hour),
      minute: intIn(reminder.minute, 0, 59, DEFAULT_SETTINGS.reminder.minute),
    },
    favorites: Array.isArray(r.favorites)
      ? [...new Set(r.favorites.filter((f): f is ExerciseId => typeof f === 'string' && isExerciseId(f)))]
      : [],
    largeButtons: r.largeButtons === true,
    voiceCount: r.voiceCount === true,
    askSessionGoal: r.askSessionGoal !== false,
    lastRecapWeek: typeof r.lastRecapWeek === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastRecapWeek) ? r.lastRecapWeek : null,
  };
}

/** Favourites first (in the order they were pinned), then the rest in catalog order. */
export function sortByFavorites<T extends { id: string }>(items: readonly T[], favorites: readonly string[]): T[] {
  const rank = (id: string) => {
    const i = favorites.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item.id) - rank(b.item.id) || a.index - b.index)
    .map((x) => x.item);
}
