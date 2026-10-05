import * as Speech from 'expo-speech';
import { act, create } from 'react-test-renderer';

import type { Workout } from '../../game';
import { useWorkout, type WorkoutControls } from '../useWorkout';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

const spoken = () => (Speech.speak as jest.Mock).mock.calls.map((c) => c[0]);

function setup(autoEndWhenIdle: boolean) {
  const done: Workout[] = [];
  const setsDone: Workout[] = [];
  let controls: WorkoutControls | null = null;
  function Probe() {
    controls = useWorkout({ voice: true, autoEndWhenIdle, onSetDone: (w) => setsDone.push(w), onDone: (w) => done.push(w) });
    return null;
  }
  act(() => {
    create(<Probe />);
  });
  return { get: () => controls!, done, setsDone };
}

describe('useWorkout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 5, 18));
    (Speech.speak as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('rests by itself between sets and says it out loud', () => {
    const w = setup(false);
    act(() => w.get().start('pushup', { sets: 2, perSet: 3, restSeconds: 30 }));
    act(() => {
      w.get().add(1);
      w.get().add(2);
    });
    expect(w.setsDone).toHaveLength(1);
    expect(w.get().workout?.phase).toBe('rest');
    expect(spoken()).toEqual(['1', '3. Set 1 done. Rest, 30 seconds.']);
    act(() => jest.advanceTimersByTime(31_000));
    expect(w.get().workout).toMatchObject({ phase: 'work', amounts: [3, 0] });
    expect(spoken().at(-1)).toBe('Rest over. Last set, go!');
    act(() => {
      w.get().add(3);
    });
    expect(w.done).toHaveLength(1);
    expect(w.done[0]!.amounts).toEqual([3, 3]);
    expect(spoken().at(-1)).toBe('3. Exercise complete. Well done!');
  });

  it('ends a camera set nobody is doing any more', () => {
    const w = setup(true);
    act(() => w.get().start('squat', { sets: 3, perSet: 10, restSeconds: 60 }));
    act(() => {
      w.get().add(4);
    });
    act(() => jest.advanceTimersByTime(21_000));
    expect(w.setsDone).toHaveLength(1);
    expect(w.get().workout).toMatchObject({ phase: 'rest', amounts: [4] });
    let stopped: number[] = [];
    act(() => {
      stopped = w.get().stop();
    });
    expect(stopped).toEqual([4]);
    expect(w.get().workout).toBeNull();
  });

  it('never ends a set by itself in manual mode', () => {
    const w = setup(false);
    act(() => w.get().start('squat', { sets: 3, perSet: 10, restSeconds: 60 }));
    act(() => {
      w.get().add(4);
    });
    act(() => jest.advanceTimersByTime(60_000));
    expect(w.setsDone).toHaveLength(0);
    act(() => w.get().finishSet());
    expect(w.setsDone).toHaveLength(1);
  });
});
