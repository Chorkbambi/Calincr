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

/** Daily quest: one suggested exercise per day with a rep target based on the player's history. */
export const QUEST = {
  /** How far back the history is read to pick the target. */
  historyDays: 28,
  /** First time doing the exercise: target per tier (reps, or seconds for holds). */
  startTarget: {
    beginner: { reps: 12, seconds: 30 },
    normal: { reps: 15, seconds: 40 },
    advanced: { reps: 8, seconds: 30 },
  },
  /** Target = last session's total × (1 + progression), at least + minStep. */
  progression: 0.1,
  minStep: { reps: 1, seconds: 5 },
  /** Not done for this many days or more: restart a bit lower (× detrainFactor). */
  detrainDays: 10,
  detrainFactor: 0.8,
  /** Muscles still tired (best multiplier < 1): lighter day (× tiredFactor). */
  tiredFactor: 0.7,
  minTarget: { reps: 3, seconds: 10 },
  /** Split into sets: [minimum total, number of sets], checked from the top. */
  sets: {
    reps: [[30, 4], [12, 3], [6, 2], [0, 1]],
    seconds: [[90, 3], [40, 2], [0, 1]],
  },
  /** Reward on completion: bonus XP = target × baseXp × xpBonusRatio (split over the muscles, no rest multiplier). */
  xpBonusRatio: 0.5,
  /** Bonus gold = max(minGold, round(HP of the current level's first monster × goldPerMonsterHp)). */
  goldPerMonsterHp: 1.5,
  minGold: 10,
} as const;

/** Combo: hits with less than windowMs between them chain; every hitsPerStep hits add bonusPerStep damage (capped). */
export const COMBO = {
  windowMs: 10_000,
  hitsPerStep: 5,
  bonusPerStep: 0.05,
  maxBonus: 0.5,
} as const;

/** Achievement reward = max(minGold, round(HP of the current level's first monster × goldPerTier[tier])). */
export const ACHIEVEMENT_REWARDS = {
  goldPerTier: { 1: 2, 2: 5, 3: 12 },
  minGold: 20,
} as const;

/** Rest timer choices offered in the app (seconds, 0 = off). */
export const REST_TIMER_CHOICES = [0, 30, 60, 90, 120] as const;

/** Voice count: holds are announced every N seconds (reps are announced one by one). */
export const VOICE = {
  holdStepSeconds: 10,
} as const;

/** Camera calibration: record the player for this long while they do slow reps (or hold). */
export const CALIBRATION = {
  durationMs: 15_000,
  /** Thresholds sit this far inside the player's measured range (0.25 = a quarter from each end). */
  margin: 0.25,
} as const;

/** Exercise styles, used by monster weaknesses. An exercise's style = the group holding most of its XP weight. */
export const STYLE_MUSCLES = {
  push: ['chest', 'triceps', 'shoulders'],
  pull: ['back', 'biceps'],
  legs: ['quads', 'glutes', 'hamstrings', 'calves'],
  core: ['abs'],
} as const satisfies Record<string, readonly MuscleId[]>;
export type ExerciseStyle = keyof typeof STYLE_MUSCLES;
export const EXERCISE_STYLES = Object.keys(STYLE_MUSCLES) as ExerciseStyle[];

/** Each enemy is weak to one style: hits with an exercise of that style deal + damageBonus. */
export const WEAKNESS = {
  damageBonus: 0.5,
} as const;

/**
 * Personal record: beating your best set of an exercise (not the first time) pays
 * max(minGold, round(HP of the current level's first monster × goldPerMonsterHp)).
 */
export const RECORDS = {
  goldPerMonsterHp: 1,
  minGold: 10,
} as const;

/** Streak freeze: protects the daily-quest streak for one missed day. Price scales with the enemy level. */
export const STREAK_FREEZE = {
  maxOwned: 2,
  goldPerMonsterHp: 3,
  minPrice: 50,
} as const;

/**
 * Weekly boss: one huge health bar per week (Monday to Sunday), hit by every strike.
 * HP = max(minHp, hit damage at the start of the week × hitsToDefeat).
 * Reward = max(minGold, round(HP of the current level's first monster × goldPerMonsterHp)).
 */
export const WEEKLY_BOSS = {
  hitsToDefeat: 300,
  minHp: 300,
  goldPerMonsterHp: 10,
  minGold: 100,
} as const;

/** Armour (more gold) and rings (combo / weakness). One of each can be worn. */
export type GearSlot = 'armor' | 'ring';
export interface GearConfig {
  id: string;
  slot: GearSlot;
  name: string;
  price: number;
  description: string;
  /** Extra gold from defeated enemies (0.25 = +25%). */
  goldBonus?: number;
  /** Extra time allowed between two chained hits. */
  comboWindowMs?: number;
  /** Raises the combo damage cap. */
  comboMaxBonus?: number;
  /** Extra damage on a weakness, added to WEAKNESS.damageBonus. */
  weaknessBonus?: number;
}
export const GEAR = [
  { id: 'leather_armor', slot: 'armor', name: 'Leather Armor', price: 300, description: '+10% gold from enemies', goldBonus: 0.1 },
  { id: 'chainmail', slot: 'armor', name: 'Chainmail', price: 5_000, description: '+25% gold from enemies', goldBonus: 0.25 },
  { id: 'plate_armor', slot: 'armor', name: 'Plate Armor', price: 80_000, description: '+50% gold from enemies', goldBonus: 0.5 },
  { id: 'dragon_scale', slot: 'armor', name: 'Dragon Scale Mail', price: 1_500_000, description: '+100% gold from enemies', goldBonus: 1 },
  { id: 'ring_of_haste', slot: 'ring', name: 'Ring of Haste', price: 800, description: 'Combo lasts 5 s longer between hits', comboWindowMs: 5_000 },
  { id: 'ring_of_fury', slot: 'ring', name: 'Ring of Fury', price: 12_000, description: 'Combo bonus can reach +75%', comboMaxBonus: 0.25 },
  { id: 'hunters_ring', slot: 'ring', name: "Hunter's Ring", price: 200_000, description: 'Weakness hits deal +100% instead of +50%', weaknessBonus: 0.5 },
] as const satisfies readonly GearConfig[];
export type GearId = (typeof GEAR)[number]['id'];

/** Purely visual items bought with gold: the glow around the sword and the colour of damage numbers. */
export type CosmeticSlot = 'glow' | 'numbers';
export const COSMETICS = [
  { id: 'glow_ember', slot: 'glow', name: 'Ember Glow', color: '#ff8a3a', price: 250 },
  { id: 'glow_frost', slot: 'glow', name: 'Frost Glow', color: '#7fd4ff', price: 250 },
  { id: 'glow_venom', slot: 'glow', name: 'Venom Glow', color: '#8cff6a', price: 1_000 },
  { id: 'glow_arcane', slot: 'glow', name: 'Arcane Glow', color: '#c08cff', price: 5_000 },
  { id: 'glow_royal', slot: 'glow', name: 'Royal Glow', color: '#ffd84a', price: 25_000 },
  { id: 'numbers_gold', slot: 'numbers', name: 'Golden Numbers', color: '#ffd84a', price: 400 },
  { id: 'numbers_ice', slot: 'numbers', name: 'Ice Numbers', color: '#9fe6ff', price: 400 },
  { id: 'numbers_toxic', slot: 'numbers', name: 'Toxic Numbers', color: '#9dff5a', price: 2_000 },
  { id: 'numbers_void', slot: 'numbers', name: 'Void Numbers', color: '#d49cff', price: 10_000 },
] as const satisfies readonly { id: string; slot: CosmeticSlot; name: string; color: string; price: number }[];
export type CosmeticId = (typeof COSMETICS)[number]['id'];
