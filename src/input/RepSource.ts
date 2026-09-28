/**
 * Anything that can detect exercise work: manual taps today,
 * camera pose detection (CameraRepSource) later.
 * The combat screen only knows this interface.
 */
export type RepEvent =
  /** `count` reps done; `burst` = entered all at once (UI plays a fast animation). */
  | { type: 'reps'; count: number; burst: boolean }
  /** Seconds held on a timed exercise (plank). */
  | { type: 'seconds'; seconds: number };

export type RepListener = (event: RepEvent) => void;

export interface RepSource {
  subscribe(listener: RepListener): () => void;
  /** Releases timers, sensors, camera… */
  dispose(): void;
}

/** Shared listener bookkeeping for RepSource implementations. */
export abstract class BaseRepSource implements RepSource {
  private listeners = new Set<RepListener>();

  subscribe(listener: RepListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(event: RepEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }

  dispose(): void {
    this.listeners.clear();
  }
}
