import { applyWork, createInitialState } from '../engine';
import { restoreState } from '../serialization';

describe('restoreState', () => {
  it('round-trips a saved state', () => {
    const { state } = applyWork(createInitialState(), 'pushup', { kind: 'reps', count: 40 }, new Date(2026, 2, 10));
    expect(restoreState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('falls back to a fresh game on garbage', () => {
    expect(restoreState(null)).toEqual(createInitialState());
    expect(restoreState('nope')).toEqual(createInitialState());
  });

  it('fills missing muscles and fixes invalid values', () => {
    const restored = restoreState({ muscles: { chest: { level: 4, xp: 12 } }, weaponId: 'laser', boss: { index: 2, hp: 9999 } });
    expect(restored.muscles.chest.level).toBe(4);
    expect(restored.muscles.back).toEqual(createInitialState().muscles.back);
    expect(restored.weaponId).toBe('starter_sword');
    expect(restored.boss).toEqual({ index: 2, hp: 36, maxHp: 36 });
  });
});
