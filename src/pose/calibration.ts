import { CALIBRATION, type ExerciseId } from '../game/config';
import { isExerciseId } from '../game/exercises';
import type { MetricId } from './metrics';
import { TRACKERS, type TrackerConfig } from './trackers';

/** Smallest movement range accepted for a calibration, per measurement. */
const MIN_RANGE: Record<MetricId, number> = {
  elbow: 30,
  knee: 30,
  kneeMin: 30,
  hip: 20,
  bodyLine: 10,
  trunkLift: 8,
  heelRaise: 0.02,
};

function percentile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i] ?? 0;
}

export type CalibrationResult = { tracker: TrackerConfig } | { error: 'not_enough_data' | 'not_enough_movement' };

/**
 * Adapts an exercise's detection thresholds to the player, from the values measured
 * while they did a few slow full reps (or held the position, for holds).
 */
export function calibrateTracker(base: TrackerConfig, values: readonly number[]): CalibrationResult {
  if (values.length < 15) return { error: 'not_enough_data' };
  const sorted = [...values].sort((a, b) => a - b);
  if (base.kind === 'hold') {
    // Accept the player's own "straight enough" line, but never looser than 25° under the default.
    const min = Math.max(base.min - 25, Math.min(base.min, percentile(sorted, 0.1) - 5));
    return { tracker: { ...base, min: Math.round(min) } };
  }
  const lo = percentile(sorted, 0.05);
  const hi = percentile(sorted, 0.95);
  const range = hi - lo;
  if (range < MIN_RANGE[base.metric]) return { error: 'not_enough_movement' };
  const inner = range * CALIBRATION.margin;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const activeIsLow = base.active < base.rest;
  return {
    tracker: {
      ...base,
      rest: round(activeIsLow ? hi - inner : lo + inner),
      active: round(activeIsLow ? lo + inner : hi - inner),
    },
  };
}

export type Calibrations = Partial<Record<ExerciseId, TrackerConfig>>;

/** Tracker to use for an exercise: the player's calibration if any, else the default. */
export function trackerFor(exerciseId: ExerciseId, calibrations: Calibrations): TrackerConfig {
  return calibrations[exerciseId] ?? TRACKERS[exerciseId];
}

/** Validates stored calibrations: only known exercises, same kind and metric as the default, finite numbers. */
export function restoreCalibrations(raw: unknown): Calibrations {
  const result: Calibrations = {};
  if (typeof raw !== 'object' || raw === null) return result;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isExerciseId(id) || typeof value !== 'object' || value === null) continue;
    const base = TRACKERS[id];
    const v = value as Record<string, unknown>;
    const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
    if (v.kind !== base.kind || v.metric !== base.metric) continue;
    if (base.kind === 'reps' && finite(v.rest) && finite(v.active) && v.rest !== v.active) {
      // Direction must match the default (active below or above rest).
      if (base.active < base.rest === v.active < v.rest) result[id] = { ...base, rest: v.rest, active: v.active };
    } else if (base.kind === 'hold' && finite(v.min)) {
      result[id] = { ...base, min: v.min };
    }
  }
  return result;
}
