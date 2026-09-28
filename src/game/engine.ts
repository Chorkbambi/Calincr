import { createBoss, type BossState } from './boss';
import {
  COMBAT,
  MUSCLE_IDS,
  PROGRESSION,
  STARTING_WEAPON,
  WEAPONS,
  type ExerciseId,
  type MuscleId,
  type WeaponId,
} from './config';
import { toDayKey, type DayKey } from './dates';
import { getExercise, muscleWeights } from './exercises';
import { addXp } from './progression';
import { INITIAL_RECOVERY, recoveryForSession, type RecoveryState } from './recovery';

export interface MuscleState extends RecoveryState {
  level: number;
  xp: number;
}

export interface GameState {
  muscles: Record<MuscleId, MuscleState>;
  weaponId: WeaponId;
  boss: BossState;
  /** Seconds of timed exercise not yet turned into a hit. */
  pendingHitSeconds: number;
}

export function createInitialState(): GameState {
  const muscles = {} as Record<MuscleId, MuscleState>;
  for (const id of MUSCLE_IDS) {
    muscles[id] = { level: PROGRESSION.startingLevel, xp: 0, ...INITIAL_RECOVERY };
  }
  return { muscles, weaponId: STARTING_WEAPON, boss: createBoss(0), pendingHitSeconds: 0 };
}

export function totalLevels(state: GameState): number {
  return MUSCLE_IDS.reduce((sum, id) => sum + state.muscles[id].level, 0);
}

/** Damage of one sword hit = sum of all muscle levels × weapon multiplier. */
export function hitDamage(state: GameState): number {
  return totalLevels(state) * WEAPONS[state.weaponId].damageMultiplier;
}

/** Input coming from a RepSource, already bound to the selected exercise. */
export type WorkInput = { kind: 'reps'; count: number } | { kind: 'seconds'; seconds: number };

export interface Hit {
  damage: number;
  bossIndex: number;
  bossHpAfter: number;
  bossMaxHp: number;
  defeated: boolean;
}

export interface DefeatedBoss {
  index: number;
  maxHp: number;
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
  defeatedBosses: DefeatedBoss[];
}

function strike(state: GameState, outcome: WorkOutcome, now: Date): void {
  const damage = hitDamage(state);
  const boss = state.boss;
  const hpAfter = Math.max(0, boss.hp - damage);
  const defeated = hpAfter === 0;
  outcome.hits.push({ damage, bossIndex: boss.index, bossHpAfter: hpAfter, bossMaxHp: boss.maxHp, defeated });
  if (defeated) {
    outcome.defeatedBosses.push({ index: boss.index, maxHp: boss.maxHp, defeatedAt: now.toISOString() });
    state.boss = createBoss(boss.index + 1);
  } else {
    state.boss = { ...boss, hp: hpAfter };
  }
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
  const units = Math.max(0, Math.floor(input.kind === 'reps' ? input.count : input.seconds));
  const day = toDayKey(now);
  const state: GameState = {
    ...previous,
    muscles: { ...previous.muscles },
    boss: { ...previous.boss },
  };
  const outcome: WorkOutcome = {
    exerciseId,
    day,
    amount: units,
    hits: [],
    xpByMuscle: {},
    multiplierByMuscle: {},
    levelUps: [],
    defeatedBosses: [],
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
