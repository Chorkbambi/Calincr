/** MediaPipe Pose landmark indices used by the rep trackers. */
export const LM = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFoot: 31,
  rightFoot: 32,
} as const;

export const LANDMARK_COUNT = 33;

/** Normalized image coordinates (0-1, y pointing down) and visibility (0-1). */
export interface Landmark {
  x: number;
  y: number;
  v: number;
}

/** One analysed camera frame. Only these numbers ever leave the camera view: never the image. */
export interface PoseFrame {
  /** Timestamp in ms. */
  t: number;
  /** Video width / height, to measure angles in real proportions. */
  aspect: number;
  landmarks: Landmark[];
}

export const MIN_VISIBILITY = 0.5;

type Point = { x: number; y: number };

function point(frame: PoseFrame, index: number): Point | null {
  const lm = frame.landmarks[index];
  if (!lm || lm.v < MIN_VISIBILITY) return null;
  return { x: lm.x * frame.aspect, y: lm.y };
}

/** Angle ABC in degrees (0-180). */
export function angleAt(a: Point, b: Point, c: Point): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const norm = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (norm === 0) return 180;
  return (Math.acos(Math.min(1, Math.max(-1, dot / norm))) * 180) / Math.PI;
}

/** Points for the given landmark indices, or null if one is not visible enough. */
export function points(frame: PoseFrame, indices: readonly number[]): Point[] | null {
  const result: Point[] = [];
  for (const i of indices) {
    const p = point(frame, i);
    if (!p) return null;
    result.push(p);
  }
  return result;
}

/** Sum of visibilities, to pick the side of the body facing the camera. */
export function visibility(frame: PoseFrame, indices: readonly number[]): number {
  return indices.reduce((sum, i) => sum + (frame.landmarks[i]?.v ?? 0), 0);
}
