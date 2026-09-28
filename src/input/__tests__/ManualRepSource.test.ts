import { ManualRepSource } from '../ManualRepSource';
import type { RepEvent } from '../RepSource';

function fakeClock() {
  let tick: (() => void) | null = null;
  return {
    clock: {
      setInterval: (fn: () => void) => {
        tick = fn;
        return 1;
      },
      clearInterval: () => {
        tick = null;
      },
    },
    advance: (seconds: number) => {
      for (let i = 0; i < seconds; i++) tick?.();
    },
  };
}

describe('ManualRepSource', () => {
  it('emits one rep per tap and a burst for a typed count', () => {
    const source = new ManualRepSource();
    const events: RepEvent[] = [];
    source.subscribe((e) => events.push(e));
    source.tapRep();
    source.addReps(12);
    source.addReps(0);
    expect(events).toEqual([
      { type: 'reps', count: 1, burst: false },
      { type: 'reps', count: 12, burst: true },
    ]);
  });

  it('emits seconds while the stopwatch runs', () => {
    const { clock, advance } = fakeClock();
    const source = new ManualRepSource(clock);
    const events: RepEvent[] = [];
    source.subscribe((e) => events.push(e));
    source.startTimer();
    advance(3);
    expect(source.stopTimer()).toBe(3);
    advance(5);
    expect(events).toEqual([1, 2, 3].map(() => ({ type: 'seconds', seconds: 1 })));
    expect(source.isTiming).toBe(false);
  });

  it('stops notifying after unsubscribe or dispose', () => {
    const source = new ManualRepSource();
    const listener = jest.fn();
    const unsubscribe = source.subscribe(listener);
    unsubscribe();
    source.tapRep();
    source.subscribe(listener);
    source.dispose();
    source.tapRep();
    expect(listener).not.toHaveBeenCalled();
  });
});
