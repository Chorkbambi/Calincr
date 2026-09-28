import type { PoseFrame } from './landmarks';
import { measure, torsoTilt } from './metrics';
import type { TrackerConfig } from './trackers';

export type CounterEvent = { type: 'reps'; count: number } | { type: 'seconds'; seconds: number };

export interface CounterStatus {
  /** False when the needed joints are not visible. */
  tracking: boolean;
  phase: 'waiting' | 'rest' | 'active' | 'holding';
  value: number | null;
}

const SMOOTHING = 3;
/** Faster than this is jitter, not a rep. */
const MIN_REP_MS = 350;
/** Frames further apart than this don't add hold time (tracking was lost). */
const MAX_HOLD_GAP_MS = 500;

/**
 * Turns a stream of pose frames into reps (or held seconds) for one exercise.
 * Pure logic, no camera or React: easy to test with synthetic frames.
 */
export class RepCounter {
  private values: number[] = [];
  private phase: CounterStatus['phase'] = 'waiting';
  private lastRepAt = -Infinity;
  private lastT: number | null = null;
  private heldMs = 0;
  private lastValue: number | null = null;

  constructor(private readonly config: TrackerConfig) {}

  status(): CounterStatus {
    return { tracking: this.lastValue !== null, phase: this.phase, value: this.lastValue };
  }

  push(frame: PoseFrame): CounterEvent[] {
    const raw = measure(this.config.metric, frame);
    if (raw === null) {
      this.lastValue = null;
      this.lastT = null;
      if (this.config.kind === 'hold') this.phase = 'waiting';
      return [];
    }
    this.values.push(raw);
    if (this.values.length > SMOOTHING) this.values.shift();
    const value = this.values.reduce((s, v) => s + v, 0) / this.values.length;
    this.lastValue = value;
    return this.config.kind === 'reps' ? this.pushRep(value, frame.t) : this.pushHold(value, frame);
  }

  private pushRep(value: number, t: number): CounterEvent[] {
    if (this.config.kind !== 'reps') return [];
    const { rest, active } = this.config;
    const isActive = active < rest ? value <= active : value >= active;
    const isRest = active < rest ? value >= rest : value <= rest;
    if (this.phase === 'waiting') {
      if (isRest) this.phase = 'rest';
      return [];
    }
    if (this.phase === 'rest' && isActive) {
      this.phase = 'active';
      return [];
    }
    if (this.phase === 'active' && isRest) {
      this.phase = 'rest';
      if (t - this.lastRepAt >= MIN_REP_MS) {
        this.lastRepAt = t;
        return [{ type: 'reps', count: 1 }];
      }
    }
    return [];
  }

  private pushHold(value: number, frame: PoseFrame): CounterEvent[] {
    if (this.config.kind !== 'hold') return [];
    const tilt = torsoTilt(frame);
    const holding = value >= this.config.min && tilt !== null && tilt <= this.config.maxTorsoTilt;
    const previousT = this.lastT;
    this.lastT = frame.t;
    this.phase = holding ? 'holding' : 'waiting';
    if (!holding || previousT === null) return [];
    const dt = frame.t - previousT;
    if (dt <= 0 || dt > MAX_HOLD_GAP_MS) return [];
    this.heldMs += dt;
    const seconds = Math.floor(this.heldMs / 1000);
    if (seconds === 0) return [];
    this.heldMs -= seconds * 1000;
    return [{ type: 'seconds', seconds }];
  }
}
