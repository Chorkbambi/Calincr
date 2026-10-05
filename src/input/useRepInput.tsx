import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { getExercise, type ExerciseId, type InputMode } from '../game';
import type { Calibrations } from '../pose/calibration';
import type { TrackerConfig } from '../pose/trackers';
import { CameraRepControls } from './camera/CameraRepControls';
import { CameraRepSource } from './CameraRepSource';
import { ManualRepControls } from './ManualRepControls';
import { ManualRepSource } from './ManualRepSource';
import type { RepSource } from './RepSource';

export interface RepInput {
  source: RepSource;
  /** UI the source needs on screen (camera setup or buttons). */
  controls: ReactElement;
  /**
   * True when counts are checked by the player at the end of the exercise (camera): the work is applied
   * after that check, not rep by rep. False when every press counts right away (manual).
   */
  reviewCounts: boolean;
  /** Counting happens away from the phone: a set with no new rep for a while ends by itself. */
  handsFree: boolean;
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
  cameraRunning,
  onCameraStart,
  onCameraStop,
  cameraOverlay,
  hideCameraImage,
  onHideCameraImageChange,
  calibrations,
  onCalibrated,
  largeButtons,
}: {
  mode: InputMode;
  exerciseId: ExerciseId;
  /** False when the combat screen is not visible: the camera is turned off. */
  active: boolean;
  repsPerPress: number;
  onRepsPerPressChange: (value: number) => void;
  /** Camera mode: a workout is in progress, the camera is open. */
  cameraRunning: boolean;
  onCameraStart: () => void;
  /** The player closed the camera before the end of the workout. */
  onCameraStop: () => void;
  /** Workout progress shown over the full-screen camera. */
  cameraOverlay?: ReactNode;
  hideCameraImage: boolean;
  onHideCameraImageChange: (hide: boolean) => void;
  calibrations: Calibrations;
  onCalibrated: (exerciseId: ExerciseId, tracker: TrackerConfig | null) => void;
  largeButtons: boolean;
}): RepInput {
  const [manual] = useState(() => new ManualRepSource());
  const [camera] = useState(() => new CameraRepSource(exerciseId));
  // Only stop the stopwatch on unmount / blur: listeners unsubscribe themselves.
  useEffect(() => {
    if (!active) manual.stopTimer();
  }, [active, manual]);
  useEffect(() => () => void manual.stopTimer(), [manual]);
  useEffect(() => camera.setCalibrations(calibrations), [camera, calibrations]);

  if (mode === 'camera') {
    return {
      source: camera,
      reviewCounts: true,
      handsFree: true,
      controls: (
        <CameraRepControls
          source={camera}
          exerciseId={exerciseId}
          active={active}
          running={cameraRunning}
          onStart={onCameraStart}
          onStop={onCameraStop}
          overlay={cameraOverlay}
          hideImage={hideCameraImage}
          onHideImageChange={onHideCameraImageChange}
          calibrated={calibrations[exerciseId] !== undefined}
          onCalibrated={(tracker) => onCalibrated(exerciseId, tracker)}
        />
      ),
    };
  }
  return {
    source: manual,
    reviewCounts: false,
    handsFree: false,
    controls: (
      <ManualRepControls
        source={manual}
        unit={getExercise(exerciseId).unit}
        repsPerPress={repsPerPress}
        onRepsPerPressChange={onRepsPerPressChange}
        largeButtons={largeButtons}
      />
    ),
  };
}
