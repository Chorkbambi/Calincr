import type { ExerciseId } from '../game/config';
import type { MetricId } from './metrics';

/**
 * How the camera recognises each exercise.
 * reps: a rep = going from the `rest` value to the `active` value and back to `rest`
 *       (if active < rest, "active" means metric ≤ active; otherwise metric ≥ active).
 * hold: seconds are counted while metric ≥ min and the torso is roughly horizontal.
 * These are detection thresholds, not balancing numbers.
 */
export type TrackerConfig =
  | { kind: 'reps'; metric: MetricId; rest: number; active: number }
  | { kind: 'hold'; metric: MetricId; min: number; maxTorsoTilt: number };

const PUSH = { kind: 'reps', metric: 'elbow', rest: 150, active: 100 } as const;
const PULL = { kind: 'reps', metric: 'elbow', rest: 150, active: 90 } as const;
const SQUAT = { kind: 'reps', metric: 'knee', rest: 160, active: 110 } as const;
const SPLIT = { kind: 'reps', metric: 'kneeMin', rest: 155, active: 105 } as const;
const BRIDGE = { kind: 'reps', metric: 'hip', rest: 140, active: 165 } as const;
const CALF = { kind: 'reps', metric: 'heelRaise', rest: 0.03, active: 0.07 } as const;

export const TRACKERS: Record<ExerciseId, TrackerConfig> = {
  wall_pushup: { kind: 'reps', metric: 'elbow', rest: 150, active: 115 },
  knee_pushup: PUSH,
  chair_dip: PUSH,
  door_row: { kind: 'reps', metric: 'elbow', rest: 150, active: 100 },
  superman: { kind: 'reps', metric: 'hip', rest: 172, active: 163 },
  chair_squat: { kind: 'reps', metric: 'knee', rest: 160, active: 115 },
  glute_bridge: BRIDGE,
  calf_raise: CALF,
  crunch: { kind: 'reps', metric: 'trunkLift', rest: 10, active: 22 },
  knee_plank: { kind: 'hold', metric: 'hip', min: 150, maxTorsoTilt: 35 },

  pushup: PUSH,
  pike_pushup: PUSH,
  bench_dip: PUSH,
  inverted_row: PULL,
  squat: SQUAT,
  lunge: SPLIT,
  single_leg_bridge: BRIDGE,
  single_leg_calf_raise: CALF,
  leg_raise: { kind: 'reps', metric: 'hip', rest: 160, active: 110 },
  plank: { kind: 'hold', metric: 'bodyLine', min: 155, maxTorsoTilt: 35 },

  pullup: PULL,
  chinup: PULL,
  dip: PUSH,
  diamond_pushup: PUSH,
  elevated_pike_pushup: PUSH,
  pistol_squat: { kind: 'reps', metric: 'kneeMin', rest: 155, active: 100 },
  bulgarian_split_squat: SPLIT,
  jump_squat: SQUAT,
  nordic_curl: { kind: 'reps', metric: 'knee', rest: 110, active: 140 },
  hanging_leg_raise: { kind: 'reps', metric: 'hip', rest: 160, active: 115 },
  hollow_hold: { kind: 'hold', metric: 'bodyLine', min: 140, maxTorsoTilt: 35 },
};
