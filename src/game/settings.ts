import { MANUAL_INPUT, type Difficulty } from './config';

export type InputMode = 'camera' | 'manual';

export interface Settings {
  inputMode: InputMode;
  difficulty: Difficulty;
  /** Manual mode: reps added by one press of the Rep button. */
  repsPerPress: number;
  /** The player has chosen camera or manual mode on first launch. */
  onboarded: boolean;
  /** Camera mode: show only the skeleton on black, not the video image. */
  hideCameraImage: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  inputMode: 'camera',
  difficulty: 'normal',
  repsPerPress: 1,
  onboarded: false,
  hideCameraImage: false,
};

export function clampRepsPerPress(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.repsPerPress;
  return Math.min(MANUAL_INPUT.maxRepsPerPress, Math.max(MANUAL_INPUT.minRepsPerPress, Math.round(value)));
}

/** Rebuilds valid settings from stored JSON. */
export function restoreSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  return {
    inputMode: r.inputMode === 'manual' || r.inputMode === 'camera' ? r.inputMode : DEFAULT_SETTINGS.inputMode,
    difficulty:
      r.difficulty === 'beginner' || r.difficulty === 'normal' || r.difficulty === 'advanced'
        ? r.difficulty
        : DEFAULT_SETTINGS.difficulty,
    repsPerPress: typeof r.repsPerPress === 'number' ? clampRepsPerPress(r.repsPerPress) : DEFAULT_SETTINGS.repsPerPress,
    onboarded: r.onboarded === true,
    hideCameraImage: r.hideCameraImage === true,
  };
}
