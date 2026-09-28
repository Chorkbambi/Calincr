import { LANDMARK_COUNT, LM, type Landmark, type PoseFrame } from '../landmarks';

type P = { x: number; y: number };

/** Point at distance `len` from `from`, rotated `deg` degrees from the direction `from`→`toward`. */
function bend(from: P, toward: P, deg: number, len = 0.1): P {
  const a = Math.atan2(toward.y - from.y, toward.x - from.x) + (deg * Math.PI) / 180;
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
}

/**
 * Side-view skeleton (left side visible, right side hidden) with given joint angles.
 * Torso horizontal by default, like a push-up or plank.
 */
export function skeleton(
  t: number,
  { elbow = 175, knee = 175, hip = 175, torsoLift = 0 }: { elbow?: number; knee?: number; hip?: number; torsoLift?: number } = {},
): PoseFrame {
  const lm: Landmark[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, v: 0 }));
  const hipP = { x: 0.5, y: 0.6 };
  const lift = (torsoLift * Math.PI) / 180;
  const shoulder = { x: hipP.x - Math.cos(lift) * 0.25, y: hipP.y - Math.sin(lift) * 0.25 };
  const kneeP = bend(hipP, shoulder, hip, 0.2);
  const ankle = bend(kneeP, hipP, knee, 0.2);
  const elbowP = bend(shoulder, hipP, 90, 0.12);
  const wrist = bend(elbowP, shoulder, elbow, 0.12);
  const set = (i: number, p: P) => (lm[i] = { x: p.x, y: p.y, v: 0.9 });
  set(LM.leftShoulder, shoulder);
  set(LM.leftHip, hipP);
  set(LM.leftKnee, kneeP);
  set(LM.leftAnkle, ankle);
  set(LM.leftElbow, elbowP);
  set(LM.leftWrist, wrist);
  set(LM.leftHeel, { x: ankle.x - 0.02, y: ankle.y + 0.01 });
  set(LM.leftFoot, { x: ankle.x + 0.05, y: ankle.y + 0.01 });
  return { t, aspect: 1, landmarks: lm };
}
