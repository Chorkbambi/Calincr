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
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  abs: 'Abs',
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

export type ExerciseUnit = 'reps' | 'seconds';
export type ExerciseTier = 'beginner' | 'normal' | 'advanced';
export type Difficulty = ExerciseTier;

export interface ExerciseConfig {
  id: string;
  name: string;
  tier: ExerciseTier;
  unit: ExerciseUnit;
  /** XP per repetition (or per second when unit is 'seconds'), before split and multiplier. */
  baseXp: number;
  /** Share of the XP given to each muscle. Must total 1.0. */
  muscles: Partial<Record<MuscleId, number>>;
}

const PUSH = { chest: 0.5, triceps: 0.3, shoulders: 0.2 } as const;
const SQUAT = { quads: 0.5, glutes: 0.35, hamstrings: 0.15 } as const;

export const EXERCISES = [
  // Beginner: simplified movements.
  { id: 'wall_pushup', name: 'Wall Push-ups', tier: 'beginner', unit: 'reps', baseXp: 4, muscles: PUSH },
  { id: 'knee_pushup', name: 'Knee Push-ups', tier: 'beginner', unit: 'reps', baseXp: 6, muscles: PUSH },
  { id: 'chair_dip', name: 'Bent-knee Chair Dips', tier: 'beginner', unit: 'reps', baseXp: 5, muscles: { triceps: 0.6, chest: 0.2, shoulders: 0.2 } },
  { id: 'door_row', name: 'Doorframe Rows', tier: 'beginner', unit: 'reps', baseXp: 5, muscles: { back: 0.6, biceps: 0.3, shoulders: 0.1 } },
  { id: 'superman', name: 'Supermans', tier: 'beginner', unit: 'reps', baseXp: 5, muscles: { back: 0.5, glutes: 0.3, hamstrings: 0.2 } },
  { id: 'chair_squat', name: 'Chair Squats', tier: 'beginner', unit: 'reps', baseXp: 5, muscles: SQUAT },
  { id: 'glute_bridge', name: 'Glute Bridges', tier: 'beginner', unit: 'reps', baseXp: 6, muscles: { glutes: 0.6, hamstrings: 0.4 } },
  { id: 'calf_raise', name: 'Calf Raises', tier: 'beginner', unit: 'reps', baseXp: 4, muscles: { calves: 1.0 } },
  { id: 'crunch', name: 'Crunches', tier: 'beginner', unit: 'reps', baseXp: 5, muscles: { abs: 1.0 } },
  { id: 'knee_plank', name: 'Knee Plank', tier: 'beginner', unit: 'seconds', baseXp: 1.5, muscles: { abs: 0.7, shoulders: 0.3 } },

  // Normal: classic bodyweight exercises.
  { id: 'pushup', name: 'Push-ups', tier: 'normal', unit: 'reps', baseXp: 10, muscles: PUSH },
  { id: 'pike_pushup', name: 'Pike Push-ups', tier: 'normal', unit: 'reps', baseXp: 11, muscles: { shoulders: 0.6, triceps: 0.3, chest: 0.1 } },
  { id: 'bench_dip', name: 'Bench Dips', tier: 'normal', unit: 'reps', baseXp: 9, muscles: { triceps: 0.6, chest: 0.2, shoulders: 0.2 } },
  { id: 'inverted_row', name: 'Inverted Rows', tier: 'normal', unit: 'reps', baseXp: 10, muscles: { back: 0.6, biceps: 0.3, shoulders: 0.1 } },
  { id: 'squat', name: 'Squats', tier: 'normal', unit: 'reps', baseXp: 8, muscles: SQUAT },
  { id: 'lunge', name: 'Lunges', tier: 'normal', unit: 'reps', baseXp: 9, muscles: { quads: 0.4, glutes: 0.4, hamstrings: 0.2 } },
  { id: 'single_leg_bridge', name: 'Single-leg Glute Bridges', tier: 'normal', unit: 'reps', baseXp: 9, muscles: { glutes: 0.6, hamstrings: 0.4 } },
  { id: 'single_leg_calf_raise', name: 'Single-leg Calf Raises', tier: 'normal', unit: 'reps', baseXp: 6, muscles: { calves: 1.0 } },
  { id: 'leg_raise', name: 'Lying Leg Raises', tier: 'normal', unit: 'reps', baseXp: 9, muscles: { abs: 0.8, quads: 0.2 } },
  { id: 'plank', name: 'Plank', tier: 'normal', unit: 'seconds', baseXp: 2, muscles: { abs: 0.7, shoulders: 0.3 } },

  // Advanced: hard variations.
  { id: 'pullup', name: 'Pull-ups', tier: 'advanced', unit: 'reps', baseXp: 16, muscles: { back: 0.6, biceps: 0.4 } },
  { id: 'chinup', name: 'Chin-ups', tier: 'advanced', unit: 'reps', baseXp: 15, muscles: { biceps: 0.5, back: 0.5 } },
  { id: 'dip', name: 'Parallel Bar Dips', tier: 'advanced', unit: 'reps', baseXp: 14, muscles: { triceps: 0.5, chest: 0.3, shoulders: 0.2 } },
  { id: 'diamond_pushup', name: 'Diamond Push-ups', tier: 'advanced', unit: 'reps', baseXp: 13, muscles: { triceps: 0.5, chest: 0.4, shoulders: 0.1 } },
  { id: 'elevated_pike_pushup', name: 'Elevated Pike Push-ups', tier: 'advanced', unit: 'reps', baseXp: 14, muscles: { shoulders: 0.7, triceps: 0.3 } },
  { id: 'pistol_squat', name: 'Pistol Squats', tier: 'advanced', unit: 'reps', baseXp: 18, muscles: SQUAT },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squats', tier: 'advanced', unit: 'reps', baseXp: 12, muscles: { quads: 0.45, glutes: 0.4, hamstrings: 0.15 } },
  { id: 'jump_squat', name: 'Jump Squats', tier: 'advanced', unit: 'reps', baseXp: 10, muscles: { quads: 0.5, glutes: 0.3, calves: 0.2 } },
  { id: 'nordic_curl', name: 'Nordic Curls', tier: 'advanced', unit: 'reps', baseXp: 18, muscles: { hamstrings: 0.8, glutes: 0.2 } },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raises', tier: 'advanced', unit: 'reps', baseXp: 14, muscles: { abs: 0.8, quads: 0.2 } },
  { id: 'hollow_hold', name: 'Hollow Body Hold', tier: 'advanced', unit: 'seconds', baseXp: 3, muscles: { abs: 0.9, quads: 0.1 } },
] as const satisfies readonly ExerciseConfig[];

export type ExerciseId = (typeof EXERCISES)[number]['id'];

/** Exercise tiers offered in each difficulty mode. */
export const DIFFICULTY_TIERS: Record<Difficulty, readonly ExerciseTier[]> = {
  beginner: ['beginner'],
  normal: ['normal'],
  advanced: ['normal', 'advanced'],
};

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

/** Swords sold in the shop, in order. The first one is the starting sword (free). */
export const WEAPONS = [
  { id: 'rusty_sword', name: 'Rusty Sword', damageMultiplier: 1, price: 0 },
  { id: 'iron_sword', name: 'Iron Sword', damageMultiplier: 1.5, price: 100 },
  { id: 'steel_sword', name: 'Steel Sword', damageMultiplier: 2, price: 400 },
  { id: 'knights_blade', name: "Knight's Blade", damageMultiplier: 3, price: 1_500 },
  { id: 'runed_sword', name: 'Runed Sword', damageMultiplier: 4.5, price: 6_000 },
  { id: 'dragonbone_sword', name: 'Dragonbone Sword', damageMultiplier: 7, price: 25_000 },
  { id: 'sunforged_blade', name: 'Sunforged Blade', damageMultiplier: 10, price: 100_000 },
  { id: 'starfall_sword', name: 'Starfall Sword', damageMultiplier: 15, price: 400_000 },
  { id: 'eternal_edge', name: 'Eternal Edge', damageMultiplier: 25, price: 2_000_000 },
] as const;

export type WeaponId = (typeof WEAPONS)[number]['id'];
export const STARTING_WEAPON: WeaponId = 'rusty_sword';

export const COMBAT = {
  /** Timed exercises (plank): one sword hit every N seconds held. */
  secondsPerHit: 5,
} as const;

/**
 * Enemies come in levels: `monstersPerLevel` monsters, then a boss, then the next level (forever).
 * monster HP = round(baseHp × levelHpGrowth^(level-1) × (1 + stage × monsterHpStep))
 * boss HP    = round(the same formula at stage = monstersPerLevel × bossHpMultiplier)
 */
export const ENEMIES = {
  monstersPerLevel: 10,
  baseHp: 20,
  levelHpGrowth: 1.6,
  monsterHpStep: 0.08,
  bossHpMultiplier: 4,
  /** Levels per zone: the scenery and monster roster change every N levels (= every N bosses). */
  levelsPerZone: 10,
} as const;

/** Gold dropped by a defeated enemy = max(1, round(maxHp × goldPerHp)), × bossGoldMultiplier for bosses. */
export const GOLD = {
  goldPerHp: 0.25,
  bossGoldMultiplier: 2,
} as const;

/** Calendar intensity: volume (reps + seconds / secondsPerHit) needed for each shade, 1 to 4. */
export const CALENDAR = {
  intensityThresholds: [1, 40, 100, 200],
} as const;

export const MANUAL_INPUT = {
  /** Allowed range for "reps per press" in manual mode. */
  minRepsPerPress: 1,
  maxRepsPerPress: 50,
} as const;
