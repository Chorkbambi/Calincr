import {
  COMBAT,
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
}

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
  };
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
  const damage = hitDamage(state);
  const enemy = state.enemy;
  const hp = Math.max(0, enemy.hp - damage);
  const defeated = hp === 0;
  outcome.hits.push({ damage, enemy: { ...enemy, hp }, defeated });
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
