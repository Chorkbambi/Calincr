import { addDays, daysBetween, startOfWeek, toDayKey } from '../dates';
import { applyWork, createInitialState } from '../engine';
import { recordWork, type SetRecord } from '../sets';
import { intensityLevel, monthGrid, summarizeByDay, totalsByExercise, totalsByMonth, totalsByWeek } from '../stats';

const set = (day: string, exerciseId: SetRecord['exerciseId'], amount: number, hour = 10): SetRecord => ({
  id: `${day}-${exerciseId}-${hour}`,
  startedAt: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
  updatedAt: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
  day,
  exerciseId,
  amount,
  xpByMuscle: {},
  multiplierByMuscle: {},
  damage: 0,
  hits: amount,
});

describe('dates', () => {
  it('uses the local calendar day', () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDayKey(new Date(2026, 0, 6, 0, 1))).toBe('2026-01-06');
  });

  it('counts days across DST changes and years', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28'); // Monday
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // Sunday
  });
});

describe('recordWork', () => {
  const ids = () => {
    let n = 0;
    return () => `set-${++n}`;
  };

  it('extends the open set for the same exercise and day, otherwise starts a new one', () => {
    const newId = ids();
    const now = new Date(2026, 2, 10, 9);
    let state = createInitialState();
    const a = applyWork(state, 'pushup', { kind: 'reps', count: 3 }, now);
    state = a.state;
    let current = recordWork(null, a.outcome, now, newId);
    const b = applyWork(state, 'pushup', { kind: 'reps', count: 2 }, now);
    current = recordWork(current, b.outcome, now, newId);
    expect(current).toMatchObject({ id: 'set-1', amount: 5, hits: 5, damage: 50 });
    expect(current.xpByMuscle.chest).toBeCloseTo(25);
    expect(current.multiplierByMuscle).toEqual({ chest: 1, triceps: 1, shoulders: 1 });

    const c = applyWork(b.state, 'squat', { kind: 'reps', count: 1 }, now);
    expect(recordWork(current, c.outcome, now, newId).id).toBe('set-2');
  });
});

describe('stats', () => {
  const sets = [
    set('2026-09-28', 'pushup', 20),
    set('2026-09-28', 'pushup', 15, 18),
    set('2026-09-28', 'plank', 60),
    set('2026-09-30', 'squat', 50),
    set('2026-10-05', 'pushup', 10),
  ];

  it('totals by exercise', () => {
    expect(totalsByExercise(sets)).toEqual({ pushup: 45, plank: 60, squat: 50 });
  });

  it('summarizes each day with volume and intensity', () => {
    const days = summarizeByDay(sets);
    const monday = days.get('2026-09-28');
    expect(monday?.volume).toBe(20 + 15 + 60 / 5);
    expect(monday?.intensity).toBe(intensityLevel(47));
    expect(monday?.sets.map((s) => s.amount)).toEqual([20, 60, 15]);
    expect(days.has('2026-09-29')).toBe(false);
  });

  it('maps volume to intensity 0-4', () => {
    expect(intensityLevel(0)).toBe(0);
    expect(intensityLevel(1)).toBe(1);
    expect(intensityLevel(40)).toBe(2);
    expect(intensityLevel(100)).toBe(3);
    expect(intensityLevel(1000)).toBe(4);
  });

  it('totals by week and by month', () => {
    expect(totalsByWeek(sets)).toEqual([
      { weekStart: '2026-09-28', totals: { pushup: 35, plank: 60, squat: 50 } },
      { weekStart: '2026-10-05', totals: { pushup: 10 } },
    ]);
    expect(totalsByMonth(sets)).toEqual([
      { month: '2026-09', totals: { pushup: 35, plank: 60, squat: 50 } },
      { month: '2026-10', totals: { pushup: 10 } },
    ]);
  });

  it('builds a Monday-first month grid', () => {
    const grid = monthGrid(2026, 9); // September 2026 starts on a Tuesday
    expect(grid[0]).toEqual([null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });
});
