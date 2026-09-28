import { WEAPONS } from '../config';
import { applyWork, createInitialState, hitDamage } from '../engine';
import { buyWeapon, equipWeapon } from '../shop';
import { DEFAULT_SETTINGS, clampRepsPerPress, restoreSettings, sortByFavorites } from '../settings';

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
  it('has sensible defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      inputMode: 'camera',
      difficulty: 'normal',
      repsPerPress: 1,
      onboardingVersion: 0,
      hideCameraImage: false,
      restTimerSeconds: 0,
      reminder: { enabled: false, hour: 18, minute: 0 },
      favorites: [],
      largeButtons: false,
      lastRecapWeek: null,
    });
  });

  it('clamps reps per press between 1 and 50', () => {
    expect(clampRepsPerPress(0)).toBe(1);
    expect(clampRepsPerPress(12.4)).toBe(12);
    expect(clampRepsPerPress(999)).toBe(50);
    expect(clampRepsPerPress(Number.NaN)).toBe(1);
  });

  it('restores valid settings and ignores garbage', () => {
    const valid = {
      inputMode: 'manual',
      difficulty: 'advanced',
      repsPerPress: 10,
      onboardingVersion: 2,
      hideCameraImage: true,
      restTimerSeconds: 90,
      reminder: { enabled: true, hour: 7, minute: 30 },
      favorites: ['pushup', 'squat'],
      largeButtons: true,
      lastRecapWeek: '2026-09-21',
    };
    expect(restoreSettings(valid)).toEqual(valid);
    expect(
      restoreSettings({
        inputMode: 'hack',
        difficulty: 7,
        repsPerPress: '5',
        restTimerSeconds: 45,
        reminder: { enabled: 'yes', hour: 25, minute: -1 },
        favorites: ['pushup', 'teleport', 'pushup', 3],
        lastRecapWeek: 'monday',
      }),
    ).toEqual({ ...DEFAULT_SETTINGS, favorites: ['pushup'] });
    expect(restoreSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates the old boolean onboarding flag', () => {
    expect(restoreSettings({ onboarded: true }).onboardingVersion).toBe(1);
    expect(restoreSettings({}).onboardingVersion).toBe(0);
  });

  it('puts favourite exercises first, in pin order', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(sortByFavorites(items, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });
});
