import { PROGRESSION } from './config';

/** XP needed to go from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  return Math.round(PROGRESSION.xpCurveBase * Math.pow(level, PROGRESSION.xpCurveExponent));
}

export interface LevelProgress {
  level: number;
  /** XP accumulated inside the current level (0 ≤ xp < xpForNextLevel(level)). */
  xp: number;
}

/** Adds XP and resolves any level-ups. */
export function addXp(progress: LevelProgress, amount: number): LevelProgress {
  let { level, xp } = progress;
  xp += amount;
  let cost = xpForNextLevel(level);
  while (xp >= cost) {
    xp -= cost;
    level += 1;
    cost = xpForNextLevel(level);
  }
  return { level, xp };
}
