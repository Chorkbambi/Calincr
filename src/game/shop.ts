import { WEAPONS, type WeaponId } from './config';
import type { GameState } from './engine';

export type ShopError = 'unknown_weapon' | 'already_owned' | 'not_enough_gold' | 'not_owned';

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
