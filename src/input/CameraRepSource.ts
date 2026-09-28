import type { ExerciseId } from '../game/config';
import type { BridgeMessage } from '../pose/messages';
import { parseBridgeMessage } from '../pose/messages';
import { RepCounter, type CounterStatus } from '../pose/repCounter';
import { TRACKERS } from '../pose/trackers';
import { BaseRepSource } from './RepSource';

export type CameraState =
  | { stage: 'loading' }
  | { stage: 'error'; code: Extract<BridgeMessage, { type: 'error' }>['code'] }
  | { stage: 'running'; body: CounterStatus };

/**
 * Reps detected by the camera. Receives validated body points from the camera page,
 * counts reps with a RepCounter and emits them like any other RepSource.
 * Keeps nothing: frames are processed and dropped immediately.
 */
export class CameraRepSource extends BaseRepSource {
  private counter: RepCounter;
  private state: CameraState = { stage: 'loading' };
  private stateListeners = new Set<(state: CameraState) => void>();

  constructor(private exerciseId: ExerciseId) {
    super();
    this.counter = new RepCounter(TRACKERS[exerciseId]);
  }

  setExercise(id: ExerciseId): void {
    if (id === this.exerciseId) return;
    this.exerciseId = id;
    this.counter = new RepCounter(TRACKERS[id]);
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

  /** Called with the raw string posted by the camera page. */
  handleMessage(data: unknown): void {
    const msg = parseBridgeMessage(data);
    if (!msg) return;
    switch (msg.type) {
      case 'ready':
        this.setState({ stage: 'running', body: this.counter.status() });
        return;
      case 'error':
        this.setState({ stage: 'error', code: msg.code });
        return;
      case 'nopose':
        this.setState({ stage: 'running', body: { tracking: false, phase: 'waiting', value: null } });
        return;
      case 'pose':
        for (const event of this.counter.push(msg.frame)) {
          this.emit(event.type === 'reps' ? { type: 'reps', count: event.count, burst: false } : event);
        }
        this.setState({ stage: 'running', body: this.counter.status() });
        return;
    }
  }

  /** Manual correction when the camera missed some reps (or seconds of a hold). */
  addManually(amount: number, unit: 'reps' | 'seconds'): void {
    const n = Math.floor(amount);
    if (!(n > 0)) return;
    this.emit(unit === 'reps' ? { type: 'reps', count: n, burst: n > 1 } : { type: 'seconds', seconds: n });
  }

  /** Back to "loading" when the camera page is (re)started. */
  restart(): void {
    this.counter = new RepCounter(TRACKERS[this.exerciseId]);
    this.setState({ stage: 'loading' });
  }

  private setState(state: CameraState): void {
    const prev = this.state;
    this.state = state;
    const changed =
      prev.stage !== state.stage ||
      (prev.stage === 'running' &&
        state.stage === 'running' &&
        (prev.body.tracking !== state.body.tracking || prev.body.phase !== state.body.phase)) ||
      (prev.stage === 'error' && state.stage === 'error' && prev.code !== state.code);
    if (changed) for (const listener of this.stateListeners) listener(state);
  }
}
