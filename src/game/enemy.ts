import { ENEMIES, GOLD } from './config';
import { zoneForLevel } from './zones';

export interface EnemyState {
  /** 1-based level. */
  level: number;
  /** 0 … monstersPerLevel - 1 = monsters, monstersPerLevel = the level's boss. */
  stage: number;
  hp: number;
  maxHp: number;
}

export function isBossStage(stage: number): boolean {
  return stage >= ENEMIES.monstersPerLevel;
}

export function enemyMaxHp(level: number, stage: number): number {
  const base =
    ENEMIES.baseHp *
    Math.pow(ENEMIES.levelHpGrowth, level - 1) *
    (1 + Math.min(stage, ENEMIES.monstersPerLevel) * ENEMIES.monsterHpStep);
  return Math.round(isBossStage(stage) ? base * ENEMIES.bossHpMultiplier : base);
}

export function createEnemy(level: number, stage: number): EnemyState {
  const maxHp = enemyMaxHp(level, stage);
  return { level, stage, hp: maxHp, maxHp };
}

/** The enemy that comes after `enemy` is defeated. */
export function nextEnemy(enemy: Pick<EnemyState, 'level' | 'stage'>): EnemyState {
  return isBossStage(enemy.stage) ? createEnemy(enemy.level + 1, 0) : createEnemy(enemy.level, enemy.stage + 1);
}

export function goldReward(enemy: Pick<EnemyState, 'stage' | 'maxHp'>): number {
  const gold = Math.max(1, Math.round(enemy.maxHp * GOLD.goldPerHp));
  return isBossStage(enemy.stage) ? gold * GOLD.bossGoldMultiplier : gold;
}

export function enemyName(level: number, stage: number): string {
  const zone = zoneForLevel(level);
  if (isBossStage(stage)) return zone.bosses[level % zone.bosses.length] ?? 'Boss';
  return zone.monsters[(level + stage) % zone.monsters.length] ?? 'Monster';
}

/** Stable number used to vary the enemy's drawing. */
export function enemyLook(level: number, stage: number): number {
  const zone = zoneForLevel(level);
  if (isBossStage(stage)) return 100 + zone.number * 2 + (level % zone.bosses.length);
  return zone.number * 5 + ((level + stage) % zone.monsters.length);
}
