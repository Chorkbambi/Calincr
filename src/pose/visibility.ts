import type { ExerciseId } from '../game/config';
import { LM, MIN_VISIBILITY, type PoseFrame } from './landmarks';
import type { MetricId } from './metrics';
import { TRACKERS } from './trackers';

export type BodyPart = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle' | 'heel' | 'toes';

const JOINTS: Record<BodyPart, readonly [number, number]> = {
  shoulder: [LM.leftShoulder, LM.rightShoulder],
  elbow: [LM.leftElbow, LM.rightElbow],
  wrist: [LM.leftWrist, LM.rightWrist],
  hip: [LM.leftHip, LM.rightHip],
  knee: [LM.leftKnee, LM.rightKnee],
  ankle: [LM.leftAnkle, LM.rightAnkle],
  heel: [LM.leftHeel, LM.rightHeel],
  toes: [LM.leftFoot, LM.rightFoot],
};

/** Body parts the camera must see for each measurement. */
const PARTS_BY_METRIC: Record<MetricId, readonly BodyPart[]> = {
  elbow: ['shoulder', 'elbow', 'wrist'],
  knee: ['hip', 'knee', 'ankle'],
  kneeMin: ['hip', 'knee', 'ankle'],
  hip: ['shoulder', 'hip', 'knee'],
  bodyLine: ['shoulder', 'hip', 'knee', 'ankle'],
  trunkLift: ['shoulder', 'hip'],
  heelRaise: ['hip', 'knee', 'ankle', 'heel', 'toes'],
};

export function requiredBodyParts(exerciseId: ExerciseId): readonly BodyPart[] {
  return PARTS_BY_METRIC[TRACKERS[exerciseId].metric];
}

const PLURAL: Record<BodyPart, string> = {
  shoulder: 'shoulders',
  elbow: 'elbows',
  wrist: 'wrists',
  hip: 'hips',
  knee: 'knees',
  ankle: 'ankles',
  heel: 'heels',
  toes: 'toes',
};

/** "shoulders, elbows and wrists" */
export function describeBodyParts(parts: readonly BodyPart[]): string {
  const words = parts.map((p) => PLURAL[p]);
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Required parts that are not visible on either side of the body in this frame. */
export function missingBodyParts(frame: PoseFrame, exerciseId: ExerciseId): BodyPart[] {
  return requiredBodyParts(exerciseId).filter((part) =>
    JOINTS[part].every((index) => (frame.landmarks[index]?.v ?? 0) < MIN_VISIBILITY),
  );
}
