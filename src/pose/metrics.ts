import { angleAt, LM, points, visibility, type PoseFrame } from './landmarks';

export type MetricId = 'elbow' | 'knee' | 'kneeMin' | 'hip' | 'bodyLine' | 'trunkLift' | 'heelRaise';

type Side = 'left' | 'right';
const SIDES: Record<Side, typeof LM[keyof typeof LM][]> = {
  left: [LM.leftShoulder, LM.leftElbow, LM.leftWrist, LM.leftHip, LM.leftKnee, LM.leftAnkle, LM.leftHeel, LM.leftFoot],
  right: [LM.rightShoulder, LM.rightElbow, LM.rightWrist, LM.rightHip, LM.rightKnee, LM.rightAnkle, LM.rightHeel, LM.rightFoot],
};

const joint = (side: Side, name: 'Shoulder' | 'Elbow' | 'Wrist' | 'Hip' | 'Knee' | 'Ankle' | 'Heel' | 'Foot'): number =>
  LM[`${side}${name}` as keyof typeof LM];

function angleOnSide(frame: PoseFrame, side: Side, a: string, b: string, c: string): number | null {
  const p = points(frame, [joint(side, a as 'Hip'), joint(side, b as 'Hip'), joint(side, c as 'Hip')]);
  return p ? angleAt(p[0]!, p[1]!, p[2]!) : null;
}

/** Angle measured on the side of the body the camera sees best. */
function bestSideAngle(frame: PoseFrame, a: string, b: string, c: string): number | null {
  const [first, second]: Side[] = visibility(frame, SIDES.left) >= visibility(frame, SIDES.right) ? ['left', 'right'] : ['right', 'left'];
  return angleOnSide(frame, first!, a, b, c) ?? angleOnSide(frame, second!, a, b, c);
}

function trunkLift(frame: PoseFrame): number | null {
  for (const side of ['left', 'right'] as Side[]) {
    const p = points(frame, [joint(side, 'Shoulder'), joint(side, 'Hip')]);
    if (p) {
      const [shoulder, hip] = p as [{ x: number; y: number }, { x: number; y: number }];
      // Degrees above horizontal of the hip → shoulder line (0 = lying flat, 90 = upright).
      return (Math.atan2(hip.y - shoulder.y, Math.abs(shoulder.x - hip.x)) * 180) / Math.PI;
    }
  }
  return null;
}

function heelRaise(frame: PoseFrame): number | null {
  let best: number | null = null;
  for (const side of ['left', 'right'] as Side[]) {
    const p = points(frame, [joint(side, 'Hip'), joint(side, 'Ankle'), joint(side, 'Heel'), joint(side, 'Foot')]);
    if (!p) continue;
    const [hip, ankle, heel, foot] = p as { x: number; y: number }[];
    const leg = Math.hypot(hip!.x - ankle!.x, hip!.y - ankle!.y);
    if (leg === 0) continue;
    const raise = (foot!.y - heel!.y) / leg;
    best = best === null ? raise : Math.max(best, raise);
  }
  return best;
}

/** Computes a body measurement from a frame, or null when the needed joints are not visible. */
export function measure(metric: MetricId, frame: PoseFrame): number | null {
  switch (metric) {
    case 'elbow':
      return bestSideAngle(frame, 'Shoulder', 'Elbow', 'Wrist');
    case 'knee':
      return bestSideAngle(frame, 'Hip', 'Knee', 'Ankle');
    case 'kneeMin': {
      const values = (['left', 'right'] as Side[])
        .map((s) => angleOnSide(frame, s, 'Hip', 'Knee', 'Ankle'))
        .filter((v): v is number => v !== null);
      return values.length > 0 ? Math.min(...values) : null;
    }
    case 'hip':
      return bestSideAngle(frame, 'Shoulder', 'Hip', 'Knee');
    case 'bodyLine':
      return bestSideAngle(frame, 'Shoulder', 'Hip', 'Ankle');
    case 'trunkLift':
      return trunkLift(frame);
    case 'heelRaise':
      return heelRaise(frame);
  }
}

/** Absolute tilt of the torso from horizontal, in degrees (for holds such as the plank). */
export function torsoTilt(frame: PoseFrame): number | null {
  const lift = trunkLift(frame);
  return lift === null ? null : Math.abs(lift);
}
