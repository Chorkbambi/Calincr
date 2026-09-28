import { BaseRepSource } from './RepSource';

type Clock = {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
};

const defaultClock: Clock = {
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
};

/** Phase 1 input: the player taps, types a count, or runs a stopwatch. */
export class ManualRepSource extends BaseRepSource {
  private timer: unknown = null;
  private elapsed = 0;
  private timerListeners = new Set<(seconds: number, running: boolean) => void>();

  constructor(private readonly clock: Clock = defaultClock) {
    super();
  }

  /** One press of the big Rep button, worth `count` reps (the player's "reps per press" setting). */
  pressRep(count = 1): void {
    const n = Math.floor(count);
    if (n > 0) this.emit({ type: 'reps', count: n, burst: n > 1 });
  }

  get isTiming(): boolean {
    return this.timer !== null;
  }

  /** Plank stopwatch: emits one second at a time while running. */
  startTimer(): void {
    if (this.timer !== null) return;
    this.elapsed = 0;
    this.timer = this.clock.setInterval(() => {
      this.elapsed += 1;
      this.emit({ type: 'seconds', seconds: 1 });
      this.notifyTimer();
    }, 1000);
    this.notifyTimer();
  }

  /** Returns the seconds held. */
  stopTimer(): number {
    if (this.timer !== null) {
      this.clock.clearInterval(this.timer);
      this.timer = null;
      this.notifyTimer();
    }
    return this.elapsed;
  }

  onTimer(listener: (seconds: number, running: boolean) => void): () => void {
    this.timerListeners.add(listener);
    return () => {
      this.timerListeners.delete(listener);
    };
  }

  private notifyTimer(): void {
    for (const listener of this.timerListeners) listener(this.elapsed, this.isTiming);
  }

  override dispose(): void {
    this.stopTimer();
    this.timerListeners.clear();
    super.dispose();
  }
}
