import {
  COSMETICS,
  EXERCISE_STYLES,
  GEAR,
  STYLE_MUSCLES,
  type CosmeticId,
  type ExerciseConfig,
  type ExerciseStyle,
  type GearConfig,
  type GearId,
  type GearSlot,
  type MuscleId,
} from './config';

export const STYLE_NAMES: Record<ExerciseStyle, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
};

/** The style holding most of the exercise's XP weight (ties: order of EXERCISE_STYLES). */
export function exerciseStyle(exercise: Pick<ExerciseConfig, 'muscles'>): ExerciseStyle {
  let best: ExerciseStyle = EXERCISE_STYLES[0]!;
  let bestWeight = -1;
  for (const style of EXERCISE_STYLES) {
    const weight = (STYLE_MUSCLES[style] as readonly MuscleId[]).reduce((sum, m) => sum + (exercise.muscles[m] ?? 0), 0);
    if (weight > bestWeight + 1e-9) {
      best = style;
      bestWeight = weight;
    }
  }
  return best;
}

/** The style an enemy is weak to. Varies from one enemy to the next, same result every time. */
export function enemyWeakness(level: number, stage: number): ExerciseStyle {
  return EXERCISE_STYLES[(level * 3 + stage) % EXERCISE_STYLES.length]!;
}

export function isGearId(id: string): id is GearId {
  return GEAR.some((g) => g.id === id);
}

export function getGear(id: GearId): GearConfig {
  const gear = GEAR.find((g) => g.id === id);
  if (!gear) throw new Error(`Unknown gear: ${id}`);
  return gear;
}

export function isCosmeticId(id: string): id is CosmeticId {
  return COSMETICS.some((c) => c.id === id);
}

export function getCosmetic(id: CosmeticId) {
  const cosmetic = COSMETICS.find((c) => c.id === id);
  if (!cosmetic) throw new Error(`Unknown cosmetic: ${id}`);
  return cosmetic;
}

export type EquippedGear = Record<GearSlot, GearId | null>;

/** Sum of the bonuses of the worn armour and ring. */
export function gearEffects(equipped: EquippedGear): Required<Pick<GearConfig, 'goldBonus' | 'comboWindowMs' | 'comboMaxBonus' | 'weaknessBonus'>> {
  const total = { goldBonus: 0, comboWindowMs: 0, comboMaxBonus: 0, weaknessBonus: 0 };
  for (const id of [equipped.armor, equipped.ring]) {
    if (!id) continue;
    const g = getGear(id);
    total.goldBonus += g.goldBonus ?? 0;
    total.comboWindowMs += g.comboWindowMs ?? 0;
    total.comboMaxBonus += g.comboMaxBonus ?? 0;
    total.weaknessBonus += g.weaknessBonus ?? 0;
  }
  return total;
}
