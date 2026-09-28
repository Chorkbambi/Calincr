import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { getExercise, type ExerciseId, type InputMode } from '../game';
import { CameraRepControls } from './camera/CameraRepControls';
import { CameraRepSource } from './CameraRepSource';
import { ManualRepControls } from './ManualRepControls';
import { ManualRepSource } from './ManualRepSource';
import type { RepSource } from './RepSource';

export interface RepInput {
  source: RepSource;
  /** UI the source needs on screen (camera preview or buttons). */
  controls: ReactElement;
}

/**
 * Picks the rep source for the combat screen: camera (default) or manual.
 * The combat screen only uses the returned RepSource interface.
 */
export function useRepInput({
  mode,
  exerciseId,
  active,
  repsPerPress,
  onRepsPerPressChange,
  hud,
}: {
  mode: InputMode;
  exerciseId: ExerciseId;
  /** False when the combat screen is not visible: the camera is turned off. */
  active: boolean;
  repsPerPress: number;
  onRepsPerPressChange: (value: number) => void;
  /** Fight info shown over the full-screen camera. */
  hud?: ReactNode;
}): RepInput {
  const [manual] = useState(() => new ManualRepSource());
  const [camera] = useState(() => new CameraRepSource(exerciseId));
  // Only stop the stopwatch on unmount / blur: listeners unsubscribe themselves.
  useEffect(() => {
    if (!active) manual.stopTimer();
  }, [active, manual]);
  useEffect(() => () => void manual.stopTimer(), [manual]);

  if (mode === 'camera') {
    return { source: camera, controls: <CameraRepControls source={camera} exerciseId={exerciseId} active={active} hud={hud} /> };
  }
  return {
    source: manual,
    controls: (
      <ManualRepControls
        source={manual}
        unit={getExercise(exerciseId).unit}
        repsPerPress={repsPerPress}
        onRepsPerPressChange={onRepsPerPressChange}
      />
    ),
  };
}
