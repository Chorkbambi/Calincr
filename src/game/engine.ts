import {
  COMBAT,
  COMBO,
  MUSCLE_IDS,
  PROGRESSION,
  STARTING_WEAPON,
  type ExerciseId,
  type MuscleId,
  type WeaponId,
} from './config';
import { toDayKey, type DayKey } from './dates';
import { createEnemy, goldReward, isBossStage, nextEnemy, type EnemyState } from './enemy';
import { getExercise, muscleWeights } from './exercises';
import { addXp } from './progression';
import { INITIAL_RECOVERY, recoveryForSession, type RecoveryState } from './recovery';
import { getWeapon } from './shop';

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
  };
}

/** Damage bonus for a combo of `count` chained hits (0.1 = +10%). */
export function comboBonus(count: number): number {
  return Math.min(COMBO.maxBonus, Math.floor(count / COMBO.hitsPerStep) * COMBO.bonusPerStep);
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
}

function strike(state: GameState, outcome: WorkOutcome, now: Date): void {
  const t = now.getTime();
  const chained = t - state.combo.lastHitAt <= COMBO.windowMs && t >= state.combo.lastHitAt;
  const combo = chained ? state.combo.count + 1 : 1;
  state.combo = { count: combo, lastHitAt: t };
  const damage = Math.round(hitDamage(state) * (1 + comboBonus(combo)));
  const enemy = state.enemy;
  const hp = Math.max(0, enemy.hp - damage);
  const defeated = hp === 0;
  outcome.hits.push({ damage, combo, enemy: { ...enemy, hp }, defeated });
  if (!defeated) {
    state.enemy = { ...enemy, hp };
    return;
  }
  const gold = goldReward(enemy);
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
  };
  if (units === 0) return { state, outcome };

  if (exercise.unit === 'seconds') state.lifetime.holdSeconds += units;
  else state.lifetime.reps += units;
  if (state.lifetime.lastActiveDay !== day) {
    state.lifetime.activeDays += 1;
    state.lifetime.lastActiveDay = day;
  }

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
        strike(state, outcome, now);
      }
    } else {
      strike(state, outcome, now);
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
