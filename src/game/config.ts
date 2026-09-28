/**
 * Every balancing number of the game lives in this file.
 * Tweak values here; the rest of the code only reads them.
 */

export const MUSCLE_IDS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quads',
  'glutes',
  'hamstrings',
  'calves',
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export const MUSCLE_NAMES: Record<MuscleId, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  shoulders: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  abs: 'Abdominaux',
  quads: 'Quadriceps',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  calves: 'Mollets',
};

export type ExerciseUnit = 'reps' | 'seconds';

export interface ExerciseConfig {
  id: string;
  name: string;
  unit: ExerciseUnit;
  /** XP per repetition (or per second when unit is 'seconds'), before split and multiplier. */
  baseXp: number;
  /** Share of the XP given to each muscle. Must total 1.0. */
  muscles: Partial<Record<MuscleId, number>>;
}

export const EXERCISES = [
  {
    id: 'pushup',
    name: 'Pompes',
    unit: 'reps',
    baseXp: 10,
    muscles: { chest: 0.5, triceps: 0.3, shoulders: 0.2 },
  },
  {
    id: 'pike_pushup',
    name: 'Pompes piquées',
    unit: 'reps',
    baseXp: 11,
    muscles: { shoulders: 0.6, triceps: 0.3, chest: 0.1 },
  },
  {
    id: 'dip',
    name: 'Dips',
    unit: 'reps',
    baseXp: 12,
    muscles: { triceps: 0.5, chest: 0.3, shoulders: 0.2 },
  },
  {
    id: 'pullup',
    name: 'Tractions',
    unit: 'reps',
    baseXp: 16,
    muscles: { back: 0.6, biceps: 0.4 },
  },
  {
    id: 'inverted_row',
    name: 'Rowing inversé',
    unit: 'reps',
    baseXp: 10,
    muscles: { back: 0.6, biceps: 0.3, shoulders: 0.1 },
  },
  {
    id: 'squat',
    name: 'Squats',
    unit: 'reps',
    baseXp: 8,
    muscles: { quads: 0.5, glutes: 0.35, hamstrings: 0.15 },
  },
  {
    id: 'lunge',
    name: 'Fentes',
    unit: 'reps',
    baseXp: 9,
    muscles: { quads: 0.4, glutes: 0.4, hamstrings: 0.2 },
  },
  {
    id: 'glute_bridge',
    name: 'Pont fessier',
    unit: 'reps',
    baseXp: 7,
    muscles: { glutes: 0.6, hamstrings: 0.4 },
  },
  {
    id: 'calf_raise',
    name: 'Mollets debout',
    unit: 'reps',
    baseXp: 5,
    muscles: { calves: 1.0 },
  },
  {
    id: 'crunch',
    name: 'Crunchs',
    unit: 'reps',
    baseXp: 6,
    muscles: { abs: 1.0 },
  },
  {
    id: 'leg_raise',
    name: 'Relevés de jambes',
    unit: 'reps',
    baseXp: 9,
    muscles: { abs: 0.8, quads: 0.2 },
  },
  {
    id: 'plank',
    name: 'Gainage (planche)',
    unit: 'seconds',
    baseXp: 2,
    muscles: { abs: 0.7, shoulders: 0.3 },
  },
] as const satisfies readonly ExerciseConfig[];

export type ExerciseId = (typeof EXERCISES)[number]['id'];

export const PROGRESSION = {
  /** xpForNextLevel(level) = round(base × level^exponent) */
  xpCurveBase: 50,
  xpCurveExponent: 1.6,
  startingLevel: 1,
} as const;

/** Per-muscle XP multiplier depending on rest, decided at the first session of the day. */
export const RECOVERY = {
  /** First ever session of this muscle. */
  firstSession: 1.0,
  /** Trained yesterday: index 0 = 2nd day in a row, 1 = 3rd day, last value = 4th day and beyond. */
  consecutiveDays: [0.7, 0.5, 0.35],
  /** Days since last session: index 0 = 2 days, 1 = 3 days, last value = 4 days or more (cap). */
  afterRestDays: [1.0, 1.25, 1.5],
  /** Thresholds used to label a multiplier in the UI. */
  tiredBelow: 1.0,
  restedAbove: 1.0,
} as const;

export const WEAPONS = {
  starter_sword: { name: 'Épée de départ', damageMultiplier: 1 },
} as const;

export type WeaponId = keyof typeof WEAPONS;
export const STARTING_WEAPON: WeaponId = 'starter_sword';

export const COMBAT = {
  /** Timed exercises (plank): one sword hit every N seconds held. */
  secondsPerHit: 5,
} as const;

export const BOSSES = {
  /** bossMaxHp(index) = round(baseHp × growth^index), index starting at 0. */
  baseHp: 20,
  hpGrowth: 1.35,
} as const;

/** Calendar intensity: volume (reps + seconds / secondsPerHit) needed for each shade, 1 to 4. */
export const CALENDAR = {
  intensityThresholds: [1, 40, 100, 200],
} as const;
