import { ENEMIES } from './config';

export type SceneryId = 'meadow' | 'forest' | 'crypt' | 'desert' | 'snow' | 'cliffs' | 'cavern' | 'ruins';

export interface ZoneDefinition {
  name: string;
  scenery: SceneryId;
  monsters: readonly string[];
  bosses: readonly string[];
}

export const ZONES: readonly ZoneDefinition[] = [
  {
    name: 'Whispering Meadows',
    scenery: 'meadow',
    monsters: ['Slime', 'Field Rat', 'Angry Scarecrow', 'Goblin Scout', 'Wild Boar'],
    bosses: ['Goblin Chieftain', 'Giant Toad'],
  },
  {
    name: 'Gloomwood Forest',
    scenery: 'forest',
    monsters: ['Shadow Wolf', 'Thorn Sprite', 'Forest Bandit', 'Giant Spider', 'Treant Sapling'],
    bosses: ['Elder Treant', 'Wolf Queen'],
  },
  {
    name: 'Sunken Crypts',
    scenery: 'crypt',
    monsters: ['Skeleton', 'Crypt Bat', 'Ghoul', 'Restless Spirit', 'Bone Archer'],
    bosses: ['Lich Acolyte', 'Crypt Warden'],
  },
  {
    name: 'Ashen Wastes',
    scenery: 'desert',
    monsters: ['Ember Imp', 'Sand Scorpion', 'Ash Golem', 'Fire Beetle', 'Dune Raider'],
    bosses: ['Magma Titan', 'Sand Wyrm'],
  },
  {
    name: 'Frostpeak Pass',
    scenery: 'snow',
    monsters: ['Ice Wolf', 'Frost Goblin', 'Yeti Cub', 'Snow Harpy', 'Rime Elemental'],
    bosses: ['Frost Giant', 'Great Yeti'],
  },
  {
    name: 'Stormspire Cliffs',
    scenery: 'cliffs',
    monsters: ['Harpy', 'Storm Hawk', 'Cliff Troll', 'Thunder Drake', 'Wind Wraith'],
    bosses: ['Storm Lord', 'Giant Roc'],
  },
  {
    name: 'Obsidian Depths',
    scenery: 'cavern',
    monsters: ['Cave Troll', 'Dark Dwarf', 'Lava Slug', 'Obsidian Knight', 'Deep Crawler'],
    bosses: ['Demon Smith', 'Ancient Wyrm'],
  },
  {
    name: 'Celestial Ruins',
    scenery: 'ruins',
    monsters: ['Fallen Angel', 'Star Golem', 'Void Watcher', 'Astral Knight', 'Mirror Phantom'],
    bosses: ['Void Archon', 'Elder Dragon'],
  },
];

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

/** 0-based zone number for a level (1-based). Keeps growing forever; the roster loops. */
export function zoneNumber(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / ENEMIES.levelsPerZone);
}

export interface Zone extends ZoneDefinition {
  number: number;
  /** Display name, with a numeral once all zones have been visited. */
  title: string;
}

export function zoneForLevel(level: number): Zone {
  const number = zoneNumber(level);
  const def = ZONES[number % ZONES.length] ?? ZONES[0]!;
  const cycle = Math.floor(number / ZONES.length);
  return { ...def, number, title: `${def.name}${ROMAN[cycle] ?? ` ${cycle + 1}`}` };
}
