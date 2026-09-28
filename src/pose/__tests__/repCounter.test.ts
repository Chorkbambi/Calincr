import { angleAt } from '../landmarks';
import { measure } from '../metrics';
import { RepCounter, type CounterEvent } from '../repCounter';
import { TRACKERS } from '../trackers';
import { EXERCISES } from '../../game/config';
import { skeleton } from './helpers';

const total = (events: CounterEvent[], type: 'reps' | 'seconds') =>
  events.reduce((s, e) => s + (e.type === 'reps' && type === 'reps' ? e.count : e.type === 'seconds' && type === 'seconds' ? e.seconds : 0), 0);

/** Feeds a sequence of angles, one frame every 66 ms (~15 fps), 3 frames per value. */
function feed(counter: RepCounter, key: 'elbow' | 'knee' | 'hip', values: number[], startT = 0) {
  const events: CounterEvent[] = [];
  let t = startT;
  for (const v of values) {
    for (let i = 0; i < 3; i++) {
      events.push(...counter.push(skeleton(t, { [key]: v })));
      t += 66;
    }
  }
  return events;
}

describe('geometry', () => {
  it('measures angles', () => {
    expect(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
  });

  it('reads the synthetic skeleton angles back', () => {
    expect(measure('elbow', skeleton(0, { elbow: 90 }))).toBeCloseTo(90, 0);
    expect(measure('knee', skeleton(0, { knee: 120 }))).toBeCloseTo(120, 0);
    expect(measure('hip', skeleton(0, { hip: 150 }))).toBeCloseTo(150, 0);
  });
});

describe('RepCounter', () => {
  it('has a tracker for every exercise', () => {
    for (const e of EXERCISES) {
      expect(TRACKERS[e.id]).toBeDefined();
      expect(TRACKERS[e.id].kind).toBe(e.unit === 'seconds' ? 'hold' : 'reps');
    }
  });

  it('counts full push-ups', () => {
    const counter = new RepCounter(TRACKERS.pushup);
    const events = feed(counter, 'elbow', [170, 130, 90, 130, 170, 130, 90, 130, 170, 90, 170]);
    expect(total(events, 'reps')).toBe(3);
  });

  it('ignores half reps', () => {
    const counter = new RepCounter(TRACKERS.pushup);
    const events = feed(counter, 'elbow', [170, 130, 120, 130, 170, 125, 170]);
    expect(total(events, 'reps')).toBe(0);
  });

  it('does not count a rep when starting at the bottom', () => {
    const counter = new RepCounter(TRACKERS.pushup);
    const events = feed(counter, 'elbow', [80, 80, 170]);
    expect(total(events, 'reps')).toBe(0);
    expect(total(feed(counter, 'elbow', [90, 170], 1000), 'reps')).toBe(1);
  });

  it('counts squats and glute bridges (active above rest)', () => {
    expect(total(feed(new RepCounter(TRACKERS.squat), 'knee', [175, 140, 100, 140, 175, 100, 175]), 'reps')).toBe(2);
    expect(total(feed(new RepCounter(TRACKERS.glute_bridge), 'hip', [120, 150, 175, 150, 120, 175, 120]), 'reps')).toBe(2);
  });

  it('rejects impossibly fast reps (jitter)', () => {
    const counter = new RepCounter(TRACKERS.pushup);
    const events: CounterEvent[] = [];
    // One frame per value, 20 ms apart: bouncing faster than a human can do reps.
    [170, 170, 170, 80, 80, 80, 170, 170, 170, 80, 80, 80, 170, 170, 170].forEach((v, i) =>
      events.push(...counter.push(skeleton(i * 20, { elbow: v }))),
    );
    expect(total(events, 'reps')).toBe(1);
  });

  it('stops tracking when the body is not visible', () => {
    const counter = new RepCounter(TRACKERS.pushup);
    const hidden = skeleton(0);
    hidden.landmarks = hidden.landmarks.map((l) => ({ ...l, v: 0.1 }));
    expect(counter.push(hidden)).toEqual([]);
    expect(counter.status().tracking).toBe(false);
  });

  it('counts plank seconds only while holding a straight horizontal body', () => {
    const counter = new RepCounter(TRACKERS.plank);
    const events: CounterEvent[] = [];
    for (let t = 0; t <= 3000; t += 100) events.push(...counter.push(skeleton(t, { hip: 178, knee: 178 })));
    expect(total(events, 'seconds')).toBe(3);
    // Standing up (torso vertical) stops the count.
    const standing: CounterEvent[] = [];
    for (let t = 3100; t <= 6000; t += 100) standing.push(...counter.push(skeleton(t, { hip: 178, knee: 178, torsoLift: 80 })));
    expect(total(standing, 'seconds')).toBe(0);
  });

  it('does not count hold time across tracking gaps', () => {
    const counter = new RepCounter(TRACKERS.plank);
    expect(counter.push(skeleton(0, { hip: 178, knee: 178 }))).toEqual([]);
    expect(counter.push(skeleton(5000, { hip: 178, knee: 178 }))).toEqual([]);
  });
});
