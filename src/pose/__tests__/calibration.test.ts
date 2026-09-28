import { calibrateTracker, restoreCalibrations, trackerFor } from '../calibration';
import { RepCounter } from '../repCounter';
import { TRACKERS } from '../trackers';
import { skeleton } from './helpers';

/** Elbow angles of slow push-ups going between `top` and `bottom`. */
const slowReps = (top: number, bottom: number, reps = 3) => {
  const values: number[] = [];
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i <= 10; i++) values.push(top - ((top - bottom) * i) / 10);
    for (let i = 10; i >= 0; i--) values.push(top - ((top - bottom) * i) / 10);
  }
  return values;
};

describe('camera calibration', () => {
  it('fits the thresholds inside the player’s own range of motion', () => {
    // A player whose arms never fully straighten (140°) and who only goes down to 105°.
    const result = calibrateTracker(TRACKERS.pushup, slowReps(140, 105));
    if (!('tracker' in result)) throw new Error('calibration failed');
    expect(result.tracker.kind).toBe('reps');
    if (result.tracker.kind !== 'reps') return;
    expect(result.tracker.rest).toBeLessThan(140);
    expect(result.tracker.active).toBeGreaterThan(105);
    expect(result.tracker.active).toBeLessThan(result.tracker.rest);

    // With the default thresholds (150 / 100) none of these reps would count; calibrated, they do.
    const count = (tracker: typeof TRACKERS.pushup) => {
      const counter = new RepCounter(tracker);
      let reps = 0;
      slowReps(140, 105, 3).forEach((v, i) => {
        for (const e of counter.push(skeleton(i * 150, { elbow: v }))) if (e.type === 'reps') reps += e.count;
      });
      return reps;
    };
    expect(count(TRACKERS.pushup)).toBe(0);
    expect(count(result.tracker)).toBeGreaterThanOrEqual(2);
  });

  it('keeps the direction for exercises where "active" is the high value', () => {
    const result = calibrateTracker(TRACKERS.glute_bridge, slowReps(170, 125).map((v) => v));
    if (!('tracker' in result) || result.tracker.kind !== 'reps') throw new Error('calibration failed');
    expect(result.tracker.active).toBeGreaterThan(result.tracker.rest);
  });

  it('refuses too little movement or too little data', () => {
    expect(calibrateTracker(TRACKERS.pushup, slowReps(150, 140))).toEqual({ error: 'not_enough_movement' });
    expect(calibrateTracker(TRACKERS.pushup, [150, 90])).toEqual({ error: 'not_enough_data' });
  });

  it('loosens a hold threshold a little, within limits', () => {
    const result = calibrateTracker(TRACKERS.plank, Array.from({ length: 40 }, () => 145));
    if (!('tracker' in result) || result.tracker.kind !== 'hold') throw new Error('calibration failed');
    expect(result.tracker.min).toBe(140);
    const tooLoose = calibrateTracker(TRACKERS.plank, Array.from({ length: 40 }, () => 60));
    if (!('tracker' in tooLoose) || tooLoose.tracker.kind !== 'hold') throw new Error('calibration failed');
    expect(tooLoose.tracker.min).toBe(130);
  });

  it('restores only valid stored calibrations', () => {
    const restored = restoreCalibrations({
      pushup: { kind: 'reps', metric: 'elbow', rest: 135, active: 110 },
      squat: { kind: 'reps', metric: 'elbow', rest: 1, active: 0 },
      plank: { kind: 'hold', metric: 'bodyLine', min: 140, maxTorsoTilt: 35 },
      crunch: { kind: 'reps', metric: 'trunkLift', rest: 30, active: 5 },
      teleport: { kind: 'reps' },
    });
    expect(Object.keys(restored).sort()).toEqual(['plank', 'pushup']);
    expect(trackerFor('pushup', restored)).toMatchObject({ rest: 135, active: 110 });
    expect(trackerFor('squat', restored)).toBe(TRACKERS.squat);
  });
});
