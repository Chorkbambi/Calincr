import { STREAK_FREEZE, WEAPONS, type CosmeticId, type CosmeticSlot, type GearId, type GearSlot, type WeaponId } from './config';
import { enemyMaxHp } from './enemy';
import type { GameState } from './engine';
import { getCosmetic, getGear, isCosmeticId, isGearId } from './styles';

export type ShopError = 'unknown_weapon' | 'unknown_item' | 'already_owned' | 'not_enough_gold' | 'not_owned' | 'max_owned';

export function getWeapon(id: WeaponId) {
  const weapon = WEAPONS.find((w) => w.id === id);
  if (!weapon) throw new Error(`Unknown weapon: ${id}`);
  return weapon;
}

export function isWeaponId(id: string): id is WeaponId {
  return WEAPONS.some((w) => w.id === id);
}

/** Buys a sword and equips it. */
export function buyWeapon(state: GameState, id: WeaponId): { state: GameState } | { error: ShopError } {
  if (!isWeaponId(id)) return { error: 'unknown_weapon' };
  if (state.ownedWeapons.includes(id)) return { error: 'already_owned' };
  const { price } = getWeapon(id);
  if (state.gold < price) return { error: 'not_enough_gold' };
  return {
    state: { ...state, gold: state.gold - price, ownedWeapons: [...state.ownedWeapons, id], weaponId: id },
  };
}

export function equipWeapon(state: GameState, id: WeaponId): { state: GameState } | { error: ShopError } {
  if (!isWeaponId(id)) return { error: 'unknown_weapon' };
  if (!state.ownedWeapons.includes(id)) return { error: 'not_owned' };
  return { state: { ...state, weaponId: id } };
}

type ShopResult = { state: GameState } | { error: ShopError };

/** Buys an armour or a ring and wears it. */
export function buyGear(state: GameState, id: GearId): ShopResult {
  if (!isGearId(id)) return { error: 'unknown_item' };
  if (state.ownedGear.includes(id)) return { error: 'already_owned' };
  const gear = getGear(id);
  if (state.gold < gear.price) return { error: 'not_enough_gold' };
  return {
    state: {
      ...state,
      gold: state.gold - gear.price,
      ownedGear: [...state.ownedGear, id],
      equippedGear: { ...state.equippedGear, [gear.slot]: id },
    },
  };
}

/** Wears an owned armour or ring, or takes off what is worn in `slot` (id = null). */
export function equipGear(state: GameState, slot: GearSlot, id: GearId | null): ShopResult {
  if (id !== null) {
    if (!isGearId(id) || getGear(id).slot !== slot) return { error: 'unknown_item' };
    if (!state.ownedGear.includes(id)) return { error: 'not_owned' };
  }
  return { state: { ...state, equippedGear: { ...state.equippedGear, [slot]: id } } };
}

export function buyCosmetic(state: GameState, id: CosmeticId): ShopResult {
  if (!isCosmeticId(id)) return { error: 'unknown_item' };
  if (state.ownedCosmetics.includes(id)) return { error: 'already_owned' };
  const cosmetic = getCosmetic(id);
  if (state.gold < cosmetic.price) return { error: 'not_enough_gold' };
  return {
    state: {
      ...state,
      gold: state.gold - cosmetic.price,
      ownedCosmetics: [...state.ownedCosmetics, id],
      equippedCosmetics: { ...state.equippedCosmetics, [cosmetic.slot]: id },
    },
  };
}

export function equipCosmetic(state: GameState, slot: CosmeticSlot, id: CosmeticId | null): ShopResult {
  if (id !== null) {
    if (!isCosmeticId(id) || getCosmetic(id).slot !== slot) return { error: 'unknown_item' };
    if (!state.ownedCosmetics.includes(id)) return { error: 'not_owned' };
  }
  return { state: { ...state, equippedCosmetics: { ...state.equippedCosmetics, [slot]: id } } };
}

/** Price of one streak freeze (grows with the enemy level, like every other reward). */
export function streakFreezePrice(state: GameState): number {
  return Math.max(STREAK_FREEZE.minPrice, Math.round(enemyMaxHp(state.enemy.level, 0) * STREAK_FREEZE.goldPerMonsterHp));
}

export function buyStreakFreeze(state: GameState): ShopResult {
  if (state.streakFreezes >= STREAK_FREEZE.maxOwned) return { error: 'max_owned' };
  const price = streakFreezePrice(state);
  if (state.gold < price) return { error: 'not_enough_gold' };
  return { state: { ...state, gold: state.gold - price, streakFreezes: state.streakFreezes + 1 } };
}
