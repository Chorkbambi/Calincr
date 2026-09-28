import { applyWork, createInitialState } from '../engine';
import { restoreState } from '../serialization';

describe('restoreState', () => {
  it('round-trips a saved state', () => {
    const { state } = applyWork(createInitialState(), 'pushup', { kind: 'reps', count: 40 }, new Date(2026, 2, 10));
    expect(state.gold).toBeGreaterThan(0);
    expect(restoreState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('falls back to a fresh game on garbage', () => {
    expect(restoreState(null)).toEqual(createInitialState());
    expect(restoreState('nope')).toEqual(createInitialState());
  });

  it('fills missing muscles and fixes invalid values', () => {
    const restored = restoreState({
      muscles: { chest: { level: 4, xp: 12, lastTrainedDay: 'DROP TABLE' } },
      weaponId: 'laser',
      ownedWeapons: ['iron_sword', 'laser', 42],
      gold: -50,
      enemy: { level: 2, stage: 3, hp: 99999 },
    });
    expect(restored.muscles.chest).toMatchObject({ level: 4, xp: 12, lastTrainedDay: null });
    expect(restored.muscles.back).toEqual(createInitialState().muscles.back);
    expect(restored.weaponId).toBe('rusty_sword');
    expect(restored.ownedWeapons).toEqual(['rusty_sword', 'iron_sword']);
    expect(restored.gold).toBe(0);
    expect(restored.enemy.hp).toBe(restored.enemy.maxHp);
  });

  it('does not equip a sword that is not owned', () => {
    expect(restoreState({ weaponId: 'eternal_edge', ownedWeapons: [] }).weaponId).toBe('rusty_sword');
  });

  it('restarts old saves (before levels) at level 1 but keeps muscles', () => {
    const restored = restoreState({ muscles: { back: { level: 7, xp: 0 } }, boss: { index: 12, hp: 5 } });
    expect(restored.enemy).toEqual(createInitialState().enemy);
    expect(restored.muscles.back.level).toBe(7);
  });
});
