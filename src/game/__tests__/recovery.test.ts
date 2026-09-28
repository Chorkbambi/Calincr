import { RECOVERY } from '../config';
import {
  currentMultiplier,
  INITIAL_RECOVERY,
  recoveryForSession,
  recoveryStatus,
  type RecoveryState,
} from '../recovery';

const trainedOn = (lastTrainedDay: string, streakDays = 1, dayMultiplier = 1): RecoveryState => ({
  lastTrainedDay,
  streakDays,
  dayMultiplier,
});

describe('recoveryForSession', () => {
  it('gives ×1.0 to the first session ever', () => {
    expect(recoveryForSession(INITIAL_RECOVERY, '2026-03-10')).toEqual({
      lastTrainedDay: '2026-03-10',
      streakDays: 1,
      dayMultiplier: 1.0,
    });
  });

  it('applies ×0.7 on the 2nd consecutive day', () => {
    const s = recoveryForSession(trainedOn('2026-03-10', 1), '2026-03-11');
    expect(s.dayMultiplier).toBe(0.7);
    expect(s.streakDays).toBe(2);
  });

  it('applies ×0.5 on the 3rd consecutive day', () => {
    expect(recoveryForSession(trainedOn('2026-03-10', 2, 0.7), '2026-03-11').dayMultiplier).toBe(0.5);
  });

  it('applies ×0.35 on the 4th consecutive day and beyond', () => {
    expect(recoveryForSession(trainedOn('2026-03-10', 3, 0.5), '2026-03-11').dayMultiplier).toBe(0.35);
    expect(recoveryForSession(trainedOn('2026-03-10', 4, 0.35), '2026-03-11').dayMultiplier).toBe(0.35);
    expect(recoveryForSession(trainedOn('2026-03-10', 20, 0.35), '2026-03-11').dayMultiplier).toBe(0.35);
  });

  it('builds the streak day after day', () => {
    let s: RecoveryState = INITIAL_RECOVERY;
    const seen: number[] = [];
    for (const day of ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']) {
      s = recoveryForSession(s, day);
      seen.push(s.dayMultiplier);
    }
    expect(seen).toEqual([1.0, 0.7, 0.5, 0.35, 0.35]);
    expect(s.streakDays).toBe(5);
  });

  it('gives ×1.0 after 2 days, ×1.25 after 3 days', () => {
    expect(recoveryForSession(trainedOn('2026-03-10', 3, 0.5), '2026-03-12')).toEqual(trainedOn('2026-03-12', 1, 1.0));
    expect(recoveryForSession(trainedOn('2026-03-10'), '2026-03-13').dayMultiplier).toBe(1.25);
  });

  it('caps at ×1.5 from 4 days on', () => {
    expect(recoveryForSession(trainedOn('2026-03-10'), '2026-03-14').dayMultiplier).toBe(1.5);
    expect(recoveryForSession(trainedOn('2026-03-10'), '2026-03-20').dayMultiplier).toBe(1.5);
    expect(recoveryForSession(trainedOn('2025-01-01'), '2026-03-20').dayMultiplier).toBe(1.5);
  });

  it('resets the streak after a rest', () => {
    const rested = recoveryForSession(trainedOn('2026-03-10', 4, 0.35), '2026-03-13');
    expect(rested.streakDays).toBe(1);
    expect(recoveryForSession(rested, '2026-03-14').dayMultiplier).toBe(0.7);
  });

  it('keeps the multiplier locked for several sessions on the same day', () => {
    const morning = recoveryForSession(trainedOn('2026-03-06'), '2026-03-10');
    expect(morning.dayMultiplier).toBe(1.5);
    const noon = recoveryForSession(morning, '2026-03-10');
    const evening = recoveryForSession(noon, '2026-03-10');
    expect(noon).toEqual(morning);
    expect(evening).toEqual(morning);
  });

  it('keeps a fatigue multiplier locked all day too', () => {
    const first = recoveryForSession(trainedOn('2026-03-09', 1), '2026-03-10');
    expect(recoveryForSession(first, '2026-03-10').dayMultiplier).toBe(0.7);
    expect(recoveryForSession(first, '2026-03-10').streakDays).toBe(2);
  });

  it('works across month and year boundaries', () => {
    expect(recoveryForSession(trainedOn('2026-02-28'), '2026-03-01').dayMultiplier).toBe(0.7);
    expect(recoveryForSession(trainedOn('2025-12-31'), '2026-01-03').dayMultiplier).toBe(1.25);
  });

  it('ignores a clock moved backwards', () => {
    const s = trainedOn('2026-03-10', 2, 0.7);
    expect(recoveryForSession(s, '2026-03-08')).toEqual(s);
  });

  it('reads its values from config', () => {
    expect(RECOVERY.consecutiveDays).toEqual([0.7, 0.5, 0.35]);
    expect(RECOVERY.afterRestDays).toEqual([1.0, 1.25, 1.5]);
  });
});

describe('currentMultiplier and recoveryStatus', () => {
  it('previews the multiplier without training', () => {
    expect(currentMultiplier(INITIAL_RECOVERY, '2026-03-10')).toBe(1);
    expect(currentMultiplier(trainedOn('2026-03-09', 1), '2026-03-10')).toBe(0.7);
    expect(currentMultiplier(trainedOn('2026-03-01'), '2026-03-10')).toBe(1.5);
    expect(currentMultiplier(trainedOn('2026-03-10', 3, 0.5), '2026-03-10')).toBe(0.5);
  });

  it('labels multipliers', () => {
    expect(recoveryStatus(0.35)).toBe('tired');
    expect(recoveryStatus(0.7)).toBe('tired');
    expect(recoveryStatus(1)).toBe('ready');
    expect(recoveryStatus(1.25)).toBe('rested');
    expect(recoveryStatus(1.5)).toBe('rested');
  });
});
