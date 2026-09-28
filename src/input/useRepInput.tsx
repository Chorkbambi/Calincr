import { useEffect, useState, type ReactElement } from 'react';

import type { ExerciseUnit } from '../game';
import { ManualRepControls } from './ManualRepControls';
import { ManualRepSource } from './ManualRepSource';
import type { RepSource } from './RepSource';

export interface RepInput {
  source: RepSource;
  /** UI the source needs on screen (buttons today, camera preview later). */
  controls: ReactElement;
}

/**
 * Picks the rep source for the combat screen. Phase 1: manual input only.
 * A CameraRepSource will plug in here without touching the combat screen.
 */
export function useRepInput(unit: ExerciseUnit): RepInput {
  const [source] = useState(() => new ManualRepSource());
  // Only stop the stopwatch on unmount: listeners unsubscribe themselves.
  useEffect(() => () => void source.stopTimer(), [source]);
  return { source, controls: <ManualRepControls source={source} unit={unit} /> };
}
