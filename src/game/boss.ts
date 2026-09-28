import { BOSSES } from './config';

export function bossMaxHp(index: number): number {
  return Math.round(BOSSES.baseHp * Math.pow(BOSSES.hpGrowth, index));
}

export interface BossState {
  index: number;
  hp: number;
  maxHp: number;
}

export function createBoss(index: number): BossState {
  const maxHp = bossMaxHp(index);
  return { index, hp: maxHp, maxHp };
}

const NAMES = [
  'Golem de paille',
  'Rat des cryptes',
  'Gobelin grincheux',
  'Squelette rouillé',
  'Loup des brumes',
  'Troll des ponts',
  'Chevalier noir',
  'Sorcière des marais',
  'Ogre des collines',
  'Wyverne cendrée',
  'Liche oubliée',
  'Dragon ancien',
];

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

/** Display name of the boss at `index` (names cycle with a numeral suffix). */
export function bossName(index: number): string {
  const cycle = Math.floor(index / NAMES.length);
  const base = NAMES[index % NAMES.length] ?? NAMES[0];
  const suffix = ROMAN[cycle] ?? ` ${cycle + 1}`;
  return `${base}${suffix}`;
}
