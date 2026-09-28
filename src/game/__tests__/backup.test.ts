import { createBackup, parseBackup } from '../backup';
import { applyWork, createInitialState } from '../engine';
import { DEFAULT_SETTINGS } from '../settings';

const NOW = new Date(2026, 8, 28, 10);

function sample() {
  const { state, outcome } = applyWork(createInitialState(), 'pushup', { kind: 'reps', count: 5 }, NOW);
  return createBackup(
    {
      state,
      settings: { ...DEFAULT_SETTINGS, inputMode: 'manual' },
      quest: null,
      calibrations: { pushup: { kind: 'reps', metric: 'elbow', rest: 140, active: 110 } },
      sets: [
        {
          id: 'a',
          startedAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
          day: '2026-09-28',
          exerciseId: 'pushup',
          amount: 5,
          xpByMuscle: outcome.xpByMuscle,
          multiplierByMuscle: outcome.multiplierByMuscle,
          damage: 50,
          hits: 5,
        },
      ],
      kills: outcome.kills,
    },
    NOW,
  );
}

describe('backup', () => {
  it('round-trips everything', () => {
    const file = sample();
    const parsed = parseBackup(JSON.stringify(file));
    if (!('data' in parsed)) throw new Error(parsed.error);
    expect(parsed.data.state).toEqual(file.state);
    expect(parsed.data.settings.inputMode).toBe('manual');
    expect(parsed.data.sets).toEqual(file.sets);
    expect(parsed.data.kills).toEqual(file.kills);
    expect(parsed.data.calibrations).toEqual(file.calibrations);
  });

  it('rejects files that are not Calincr backups', () => {
    expect(parseBackup('hello')).toEqual({ error: 'not_json' });
    expect(parseBackup('{"app":"other","version":1}')).toEqual({ error: 'not_a_backup' });
    expect(parseBackup('{"app":"calincr","version":99}')).toEqual({ error: 'newer_version' });
    expect(parseBackup('x'.repeat(21 * 1024 * 1024))).toEqual({ error: 'too_big' });
  });

  it('drops invalid rows and repairs invalid values', () => {
    const file = sample();
    const tampered = {
      ...file,
      state: { ...file.state, gold: -999 },
      sets: [...file.sets, { ...file.sets[0], id: 'b', exerciseId: 'teleport' }, { ...file.sets[0], id: 'c', amount: -1 }, file.sets[0]],
      kills: [{ level: 0, stage: 0, boss: 'yes' }],
    };
    const parsed = parseBackup(JSON.stringify(tampered));
    if (!('data' in parsed)) throw new Error(parsed.error);
    expect(parsed.data.state.gold).toBe(0);
    expect(parsed.data.sets.map((s) => s.id)).toEqual(['a']);
    expect(parsed.data.kills).toEqual([]);
  });
});
