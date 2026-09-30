import type { SetRecord } from '../sets';
import { monthSummary } from '../stats';

const set = (day: string, exerciseId: SetRecord['exerciseId'], amount: number): SetRecord => ({
  id: `${day}-${exerciseId}-${amount}`,
  startedAt: `${day}T10:00:00.000Z`,
  updatedAt: `${day}T10:00:00.000Z`,
  day,
  exerciseId,
  amount,
  xpByMuscle: {},
  multiplierByMuscle: {},
  damage: 0,
  hits: amount,
});

describe('monthSummary', () => {
  it('sums the month and finds the records beaten against earlier months', () => {
    const sets = [
      set('2026-08-20', 'pushup', 12),
      set('2026-08-21', 'squat', 30),
      set('2026-09-02', 'pushup', 15),
      set('2026-09-02', 'pushup', 10),
      set('2026-09-05', 'squat', 20),
      set('2026-09-06', 'plank', 45),
      set('2026-09-07', 'lunge', 10),
      set('2026-10-01', 'pushup', 99),
    ];
    expect(monthSummary(sets, '2026-09')).toEqual({
      month: '2026-09',
      activeDays: 4,
      sets: 5,
      reps: 55,
      holdSeconds: 45,
      topExercise: 'pushup',
      // Squats did not beat 30; lunges were never done before (no record to beat).
      records: [{ exerciseId: 'pushup', previous: 12, best: 15 }],
    });
  });

  it('is empty for a month without training', () => {
    expect(monthSummary([], '2026-09')).toMatchObject({ activeDays: 0, sets: 0, topExercise: null, records: [] });
  });
});
