import { WEAPONS } from '../config';
import { applyWork, createInitialState, hitDamage } from '../engine';
import { buyWeapon, equipWeapon } from '../shop';
import { DEFAULT_SETTINGS, clampRepsPerPress, restoreSettings } from '../settings';

describe('shop', () => {
  it('sells swords in increasing price and power', () => {
    for (let i = 1; i < WEAPONS.length; i++) {
      expect(WEAPONS[i]!.price).toBeGreaterThan(WEAPONS[i - 1]!.price);
      expect(WEAPONS[i]!.damageMultiplier).toBeGreaterThan(WEAPONS[i - 1]!.damageMultiplier);
    }
    expect(WEAPONS[0]).toMatchObject({ id: 'rusty_sword', price: 0, damageMultiplier: 1 });
  });

  it('refuses a purchase without enough gold', () => {
    expect(buyWeapon(createInitialState(), 'iron_sword')).toEqual({ error: 'not_enough_gold' });
  });

  it('buys, pays and equips a sword', () => {
    const rich = { ...createInitialState(), gold: 150 };
    const result = buyWeapon(rich, 'iron_sword');
    if (!('state' in result)) throw new Error('purchase failed');
    expect(result.state.gold).toBe(50);
    expect(result.state.ownedWeapons).toEqual(['rusty_sword', 'iron_sword']);
    expect(result.state.weaponId).toBe('iron_sword');
    expect(hitDamage(result.state)).toBe(15);
    expect(buyWeapon(result.state, 'iron_sword')).toEqual({ error: 'already_owned' });
  });

  it('equips only owned swords', () => {
    const state = createInitialState();
    expect(equipWeapon(state, 'steel_sword')).toEqual({ error: 'not_owned' });
    expect(equipWeapon(state, 'rusty_sword')).toEqual({ state });
  });

  it('pays for swords with gold earned from kills', () => {
    let state = createInitialState();
    for (let i = 0; i < 20 && state.gold < 100; i++) state = applyWork(state, 'squat', { kind: 'reps', count: 10 }, new Date(2026, 2, 10)).state;
    expect(state.gold).toBeGreaterThanOrEqual(100);
    expect('state' in buyWeapon(state, 'iron_sword')).toBe(true);
  });
});

describe('settings', () => {
  it('defaults to camera mode, normal difficulty, 1 rep per press', () => {
    expect(DEFAULT_SETTINGS).toEqual({ inputMode: 'camera', difficulty: 'normal', repsPerPress: 1 });
  });

  it('clamps reps per press between 1 and 50', () => {
    expect(clampRepsPerPress(0)).toBe(1);
    expect(clampRepsPerPress(12.4)).toBe(12);
    expect(clampRepsPerPress(999)).toBe(50);
    expect(clampRepsPerPress(Number.NaN)).toBe(1);
  });

  it('restores valid settings and ignores garbage', () => {
    expect(restoreSettings({ inputMode: 'manual', difficulty: 'advanced', repsPerPress: 10 })).toEqual({
      inputMode: 'manual',
      difficulty: 'advanced',
      repsPerPress: 10,
    });
    expect(restoreSettings({ inputMode: 'hack', difficulty: 7, repsPerPress: '5' })).toEqual(DEFAULT_SETTINGS);
    expect(restoreSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
