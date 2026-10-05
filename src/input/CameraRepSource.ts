import type { ExerciseId } from '../game/config';
import type { BridgeMessage } from '../pose/messages';
import { parseBridgeMessage } from '../pose/messages';
import { calibrateTracker, trackerFor, type CalibrationResult, type Calibrations } from '../pose/calibration';
import { measure } from '../pose/metrics';
import { RepCounter, type CounterStatus } from '../pose/repCounter';
import { missingBodyParts, type BodyPart } from '../pose/visibility';
import { BaseRepSource } from './RepSource';

export type CameraState =
  | { stage: 'loading' }
  | { stage: 'error'; code: Extract<BridgeMessage, { type: 'error' }>['code'] }
  | { stage: 'running'; body: CounterStatus; missing: BodyPart[] };

/**
 * Reps detected by the camera. Receives validated body points from the camera page,
 * counts reps with a RepCounter and emits them like any other RepSource.
 * Keeps nothing: frames are processed and dropped immediately.
 */
export class CameraRepSource extends BaseRepSource {
  private counter: RepCounter;
  private state: CameraState = { stage: 'loading' };
  private stateListeners = new Set<(state: CameraState) => void>();
  private calibrations: Calibrations = {};
  /** Values measured while calibrating (null when not calibrating). No rep is counted meanwhile. */
  private calibrationValues: number[] | null = null;

  constructor(private exerciseId: ExerciseId) {
    super();
    this.counter = new RepCounter(trackerFor(exerciseId, this.calibrations));
  }

  setExercise(id: ExerciseId): void {
    if (id === this.exerciseId) return;
    this.exerciseId = id;
    this.calibrationValues = null;
    this.counter = new RepCounter(trackerFor(id, this.calibrations));
  }

  /** Player-specific thresholds; applied immediately. */
  setCalibrations(calibrations: Calibrations): void {
    this.calibrations = calibrations;
    this.counter = new RepCounter(trackerFor(this.exerciseId, calibrations));
  }

  startCalibration(): void {
    this.calibrationValues = [];
  }

  /** Stops calibrating and returns the adapted thresholds (not saved: the caller decides). */
  finishCalibration(): CalibrationResult {
    const values = this.calibrationValues ?? [];
    this.calibrationValues = null;
    return calibrateTracker(trackerFor(this.exerciseId, {}), values);
  }

  get isCalibrating(): boolean {
    return this.calibrationValues !== null;
  }

  getState(): CameraState {
    return this.state;
  }

  onState(listener: (state: CameraState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /** Called with the raw string posted by the camera page. Returns the validated message (null if rejected). */
  handleMessage(data: unknown): BridgeMessage | null {
    const msg = parseBridgeMessage(data);
    if (!msg) return null;
    switch (msg.type) {
      case 'needAssets':
        break;
      case 'ready':
        this.setState({ stage: 'running', body: this.counter.status(), missing: [] });
        break;
      case 'error':
        this.setState({ stage: 'error', code: msg.code });
        break;
      case 'nopose':
        this.setState({ stage: 'running', body: { tracking: false, phase: 'waiting', value: null }, missing: [] });
        break;
      case 'pose':
        if (this.calibrationValues) {
          const value = measure(trackerFor(this.exerciseId, {}).metric, msg.frame);
          if (value !== null) this.calibrationValues.push(value);
          this.setState({ stage: 'running', body: this.counter.status(), missing: missingBodyParts(msg.frame, this.exerciseId) });
          break;
        }
        for (const event of this.counter.push(msg.frame)) {
          this.emit(event.type === 'reps' ? { type: 'reps', count: event.count, burst: false } : event);
        }
        this.setState({ stage: 'running', body: this.counter.status(), missing: missingBodyParts(msg.frame, this.exerciseId) });
        break;
    }
    return msg;
  }

  /** Next set: a movement half-done during the rest must not count as its first rep. */
  override endSet(): void {
    this.counter = new RepCounter(trackerFor(this.exerciseId, this.calibrations));
  }

  /** Back to "loading" when the camera page is (re)started. */
  restart(): void {
    this.counter = new RepCounter(trackerFor(this.exerciseId, this.calibrations));
    this.calibrationValues = null;
    this.setState({ stage: 'loading' });
  }

  private setState(state: CameraState): void {
    const prev = this.state;
    this.state = state;
    const changed =
      prev.stage !== state.stage ||
      (prev.stage === 'running' &&
        state.stage === 'running' &&
        (prev.body.tracking !== state.body.tracking ||
          prev.body.phase !== state.body.phase ||
          prev.missing.join() !== state.missing.join())) ||
      (prev.stage === 'error' && state.stage === 'error' && prev.code !== state.code);
    if (changed) for (const listener of this.stateListeners) listener(state);
  }
}
