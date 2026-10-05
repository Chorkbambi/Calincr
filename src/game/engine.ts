import {
  COMBAT,
  COMBO,
  MUSCLE_IDS,
  PROGRESSION,
  STARTING_WEAPON,
  WEAKNESS,
  WEEKLY_BOSS,
  type CosmeticId,
  type CosmeticSlot,
  type ExerciseId,
  type ExerciseStyle,
  type GearId,
  type MuscleId,
  type WeaponId,
} from './config';
import { startOfWeek, toDayKey, type DayKey } from './dates';
import { createEnemy, enemyMaxHp, goldReward, isBossStage, nextEnemy, type EnemyState } from './enemy';
import { getExercise, muscleWeights } from './exercises';
import type { SessionRecord } from './records';
import { addXp } from './progression';
import { INITIAL_RECOVERY, recoveryForSession, type RecoveryState } from './recovery';
import { getWeapon } from './shop';
import { enemyWeakness, exerciseStyle, gearEffects, type EquippedGear } from './styles';
import { INITIAL_WEEKLY_GOAL, recordTrainingDay, type WeeklyGoalState } from './weeklyGoal';

export interface MuscleState extends RecoveryState {
  level: number;
  xp: number;
}

export interface GameState {
  muscles: Record<MuscleId, MuscleState>;
  weaponId: WeaponId;
  ownedWeapons: WeaponId[];
  gold: number;
  enemy: EnemyState;
  /** Seconds of timed exercise not yet turned into a hit. */
  pendingHitSeconds: number;
  /** Hits chained without a long pause (lastHitAt = ms timestamp). */
  combo: { count: number; lastHitAt: number };
  /** Lifetime counters (achievements, recap). */
  lifetime: LifetimeStats;
  /** Unlocked achievement ids. */
  achievements: string[];
  ownedGear: GearId[];
  equippedGear: EquippedGear;
  ownedCosmetics: CosmeticId[];
  equippedCosmetics: Record<CosmeticSlot, CosmeticId | null>;
  /** Protect the weekly-goal streak for one missed week each. */
  streakFreezes: number;
  /** Training days wanted per week and the weekly streak. */
  weekly: WeeklyGoalState;
  /** Best single set ever per exercise (reps, or seconds for holds): skills and harder variations. */
  records: Partial<Record<ExerciseId, number>>;
  /** Personal records: best session (one day, all sets) per exercise, checked when the exercise is finished. */
  sessionRecords: Partial<Record<ExerciseId, SessionRecord>>;
  weeklyBoss: WeeklyBossState | null;
}

export interface WeeklyBossState {
  /** Monday of the boss's week. */
  weekStart: DayKey;
  hp: number;
  maxHp: number;
  defeated: boolean;
}

export interface LifetimeStats {
  reps: number;
  holdSeconds: number;
  kills: number;
  bosses: number;
  questsCompleted: number;
  bestQuestStreak: number;
  activeDays: number;
  lastActiveDay: DayKey | null;
  records: number;
  weeklyBosses: number;
}

export const EMPTY_LIFETIME: LifetimeStats = {
  reps: 0,
  holdSeconds: 0,
  kills: 0,
  bosses: 0,
  questsCompleted: 0,
  bestQuestStreak: 0,
  activeDays: 0,
  lastActiveDay: null,
  records: 0,
  weeklyBosses: 0,
};

export function createInitialState(): GameState {
  const muscles = {} as Record<MuscleId, MuscleState>;
  for (const id of MUSCLE_IDS) {
    muscles[id] = { level: PROGRESSION.startingLevel, xp: 0, ...INITIAL_RECOVERY };
  }
  return {
    muscles,
    weaponId: STARTING_WEAPON,
    ownedWeapons: [STARTING_WEAPON],
    gold: 0,
    enemy: createEnemy(1, 0),
    pendingHitSeconds: 0,
    combo: { count: 0, lastHitAt: 0 },
    lifetime: { ...EMPTY_LIFETIME },
    achievements: [],
    ownedGear: [],
    equippedGear: { armor: null, ring: null },
    ownedCosmetics: [],
    equippedCosmetics: { glow: null, numbers: null },
    streakFreezes: 0,
    weekly: { ...INITIAL_WEEKLY_GOAL },
    records: {},
    sessionRecords: {},
    weeklyBoss: null,
  };
}

/** Damage bonus for a combo of `count` chained hits (0.1 = +10%). `extraCap` comes from a ring. */
export function comboBonus(count: number, extraCap = 0): number {
  return Math.min(COMBO.maxBonus + extraCap, Math.floor(count / COMBO.hitsPerStep) * COMBO.bonusPerStep);
}

/** A new set starts after a rest: the combo of the previous set is over. */
export function breakCombo(state: GameState): GameState {
  return state.combo.count === 0 ? state : { ...state, combo: { count: 0, lastHitAt: 0 } };
}

export function totalLevels(state: GameState): number {
  return MUSCLE_IDS.reduce((sum, id) => sum + state.muscles[id].level, 0);
}

/** Damage of one sword hit = sum of all muscle levels × weapon multiplier (rounded). */
export function hitDamage(state: GameState): number {
  return Math.round(totalLevels(state) * getWeapon(state.weaponId).damageMultiplier);
}

/** Input coming from a RepSource, already bound to the selected exercise. */
export type WorkInput = { kind: 'reps'; count: number } | { kind: 'seconds'; seconds: number };

export interface Hit {
  damage: number;
  /** Chained hits so far, this one included. */
  combo: number;
  /** The exercise's style is the enemy's weakness. */
  weak: boolean;
  enemy: EnemyState;
  defeated: boolean;
}

export interface Kill {
  level: number;
  stage: number;
  boss: boolean;
  maxHp: number;
  gold: number;
  defeatedAt: string;
}

export interface WorkOutcome {
  exerciseId: ExerciseId;
  day: DayKey;
  /** Reps, or seconds for timed exercises. */
  amount: number;
  hits: Hit[];
  xpByMuscle: Partial<Record<MuscleId, number>>;
  multiplierByMuscle: Partial<Record<MuscleId, number>>;
  levelUps: { muscle: MuscleId; level: number }[];
  kills: Kill[];
  goldEarned: number;
  /** Gold paid when this work defeated the weekly boss. */
  weeklyBossGold: number | null;
  /** Gold paid when this work met the week's training-days goal. */
  weeklyGoalGold: number | null;
}

/** HP of a new weekly boss for this player (scales with their damage). */
export function weeklyBossHp(state: GameState): number {
  return Math.max(WEEKLY_BOSS.minHp, hitDamage(state) * WEEKLY_BOSS.hitsToDefeat);
}

export function weeklyBossGold(state: GameState): number {
  return Math.max(WEEKLY_BOSS.minGold, Math.round(enemyMaxHp(state.enemy.level, 0) * WEEKLY_BOSS.goldPerMonsterHp));
}

/** This week's boss: the stored one, or a fresh one when a new week started. */
export function currentWeeklyBoss(state: GameState, today: DayKey): WeeklyBossState {
  const weekStart = startOfWeek(today);
  if (state.weeklyBoss && state.weeklyBoss.weekStart === weekStart) return state.weeklyBoss;
  const maxHp = weeklyBossHp(state);
  return { weekStart, hp: maxHp, maxHp, defeated: false };
}

function strike(state: GameState, outcome: WorkOutcome, now: Date, style: ExerciseStyle): void {
  const gear = gearEffects(state.equippedGear);
  const t = now.getTime();
  const chained = t - state.combo.lastHitAt <= COMBO.windowMs + gear.comboWindowMs && t >= state.combo.lastHitAt;
  const combo = chained ? state.combo.count + 1 : 1;
  state.combo = { count: combo, lastHitAt: t };
  const enemy = state.enemy;
  const weak = enemyWeakness(enemy.level, enemy.stage) === style;
  const weakBonus = weak ? WEAKNESS.damageBonus + gear.weaknessBonus : 0;
  const damage = Math.round(hitDamage(state) * (1 + comboBonus(combo, gear.comboMaxBonus)) * (1 + weakBonus));

  const boss = state.weeklyBoss;
  if (boss && !boss.defeated) {
    const bossHp = Math.max(0, boss.hp - damage);
    state.weeklyBoss = { ...boss, hp: bossHp, defeated: bossHp === 0 };
    if (bossHp === 0) {
      const reward = weeklyBossGold(state);
      state.gold += reward;
      outcome.goldEarned += reward;
      outcome.weeklyBossGold = reward;
      state.lifetime.weeklyBosses += 1;
    }
  }

  const hp = Math.max(0, enemy.hp - damage);
  const defeated = hp === 0;
  outcome.hits.push({ damage, combo, weak, enemy: { ...enemy, hp }, defeated });
  if (!defeated) {
    state.enemy = { ...enemy, hp };
    return;
  }
  const gold = Math.round(goldReward(enemy) * (1 + gear.goldBonus));
  outcome.kills.push({
    level: enemy.level,
    stage: enemy.stage,
    boss: isBossStage(enemy.stage),
    maxHp: enemy.maxHp,
    gold,
    defeatedAt: now.toISOString(),
  });
  outcome.goldEarned += gold;
  state.gold += gold;
  state.lifetime.kills += 1;
  if (isBossStage(enemy.stage)) state.lifetime.bosses += 1;
  state.enemy = nextEnemy(enemy);
}

/**
 * Applies real exercise work: each rep is a sword hit followed by its XP gain,
 * timed exercises hit once every COMBAT.secondsPerHit seconds.
 * Pure: returns a new state and never mutates `previous`.
 */
export function applyWork(
  previous: GameState,
  exerciseId: ExerciseId,
  input: WorkInput,
  now: Date,
): { state: GameState; outcome: WorkOutcome } {
  const exercise = getExercise(exerciseId);
  const raw = input.kind === 'reps' ? input.count : input.seconds;
  const units = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  const day = toDayKey(now);
  const state: GameState = {
    ...previous,
    muscles: { ...previous.muscles },
    ownedWeapons: [...previous.ownedWeapons],
    enemy: { ...previous.enemy },
    combo: { ...previous.combo },
    lifetime: { ...previous.lifetime },
    achievements: [...previous.achievements],
    weekly: { ...previous.weekly, days: [...previous.weekly.days] },
  };
  const outcome: WorkOutcome = {
    exerciseId,
    day,
    amount: units,
    hits: [],
    xpByMuscle: {},
    multiplierByMuscle: {},
    levelUps: [],
    kills: [],
    goldEarned: 0,
    weeklyBossGold: null,
    weeklyGoalGold: null,
  };
  if (units === 0) return { state, outcome };
  state.weeklyBoss = currentWeeklyBoss(state, day);
  const style = exerciseStyle(exercise);

  if (exercise.unit === 'seconds') state.lifetime.holdSeconds += units;
  else state.lifetime.reps += units;
  if (state.lifetime.lastActiveDay !== day) {
    state.lifetime.activeDays += 1;
    state.lifetime.lastActiveDay = day;
  }
  outcome.weeklyGoalGold = recordTrainingDay(state, day);
  if (outcome.weeklyGoalGold !== null) outcome.goldEarned += outcome.weeklyGoalGold;

  const weights = muscleWeights(exercise);
  for (const [muscle] of weights) {
    const muscleState = state.muscles[muscle];
    state.muscles[muscle] = { ...muscleState, ...recoveryForSession(muscleState, day) };
    outcome.multiplierByMuscle[muscle] = state.muscles[muscle].dayMultiplier;
  }

  const timed = exercise.unit === 'seconds';
  for (let i = 0; i < units; i++) {
    if (timed) {
      state.pendingHitSeconds += 1;
      if (state.pendingHitSeconds >= COMBAT.secondsPerHit) {
        state.pendingHitSeconds -= COMBAT.secondsPerHit;
        strike(state, outcome, now, style);
      }
    } else {
      strike(state, outcome, now, style);
    }
    for (const [muscle, weight] of weights) {
      const muscleState = state.muscles[muscle];
      const gained = exercise.baseXp * weight * muscleState.dayMultiplier;
      const progress = addXp(muscleState, gained);
      if (progress.level > muscleState.level) outcome.levelUps.push({ muscle, level: progress.level });
      state.muscles[muscle] = { ...muscleState, ...progress };
      outcome.xpByMuscle[muscle] = (outcome.xpByMuscle[muscle] ?? 0) + gained;
    }
  }
  return { state, outcome };
}
