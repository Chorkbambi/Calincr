import { ACHIEVEMENT_REWARDS, MUSCLE_IDS, WEAPONS } from './config';
import { enemyMaxHp } from './enemy';
import type { GameState } from './engine';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  /** 1 = easy, 3 = hard: sets the gold reward. */
  tier: 1 | 2 | 3;
  /** Current progress and target. */
  progress: (state: GameState) => { current: number; target: number };
}

const minMuscleLevel = (state: GameState) => Math.min(...MUSCLE_IDS.map((m) => state.muscles[m].level));

const count = (target: number, value: (s: GameState) => number) => (s: GameState) => ({
  current: Math.min(value(s), target),
  target,
});

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Defeat your first monster.', tier: 1, progress: count(1, (s) => s.lifetime.kills) },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat your first boss.', tier: 1, progress: count(1, (s) => s.lifetime.bosses) },
  { id: 'monster_hunter', name: 'Monster Hunter', description: 'Defeat 100 enemies.', tier: 2, progress: count(100, (s) => s.lifetime.kills) },
  { id: 'explorer', name: 'Explorer', description: 'Reach the second zone (level 11).', tier: 2, progress: count(11, (s) => s.enemy.level) },
  { id: 'reps_100', name: 'Warming Up', description: 'Do 100 reps in total.', tier: 1, progress: count(100, (s) => s.lifetime.reps) },
  { id: 'reps_1000', name: 'Thousand Strikes', description: 'Do 1,000 reps in total.', tier: 2, progress: count(1000, (s) => s.lifetime.reps) },
  { id: 'reps_10000', name: 'Living Legend', description: 'Do 10,000 reps in total.', tier: 3, progress: count(10000, (s) => s.lifetime.reps) },
  { id: 'iron_core', name: 'Iron Core', description: 'Hold planks for 10 minutes in total.', tier: 2, progress: count(600, (s) => s.lifetime.holdSeconds) },
  { id: 'quest_taker', name: 'Quest Taker', description: 'Complete your first daily quest.', tier: 1, progress: count(1, (s) => s.lifetime.questsCompleted) },
  { id: 'unbreakable', name: 'Unbreakable', description: 'Meet your weekly goal 4 weeks in a row.', tier: 2, progress: count(4, (s) => s.weekly.best) },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Meet your weekly goal 12 weeks in a row.', tier: 3, progress: count(12, (s) => s.weekly.best) },
  { id: 'dedicated', name: 'Dedicated', description: 'Train on 10 different days.', tier: 1, progress: count(10, (s) => s.lifetime.activeDays) },
  { id: 'devoted', name: 'Devoted', description: 'Train on 50 different days.', tier: 3, progress: count(50, (s) => s.lifetime.activeDays) },
  { id: 'balanced_5', name: 'Balanced Warrior', description: 'Get every muscle to level 5.', tier: 2, progress: count(5, minMuscleLevel) },
  { id: 'balanced_10', name: 'Perfect Balance', description: 'Get every muscle to level 10.', tier: 3, progress: count(10, minMuscleLevel) },
  { id: 'armorer', name: 'Armorer', description: 'Own 3 swords.', tier: 1, progress: count(3, (s) => s.ownedWeapons.length) },
  { id: 'record_breaker', name: 'Record Breaker', description: 'Beat one of your personal records.', tier: 1, progress: count(1, (s) => s.lifetime.records) },
  { id: 'weekly_champion', name: 'Weekly Champion', description: 'Defeat a weekly boss.', tier: 2, progress: count(1, (s) => s.lifetime.weeklyBosses) },
  { id: 'well_equipped', name: 'Well Equipped', description: 'Wear an armor and a ring.', tier: 1, progress: count(2, (s) => (s.equippedGear.armor ? 1 : 0) + (s.equippedGear.ring ? 1 : 0)) },
  { id: 'arsenal', name: 'Legendary Arsenal', description: 'Own every sword.', tier: 3, progress: count(WEAPONS.length, (s) => s.ownedWeapons.length) },
];

export function achievementGold(state: GameState, tier: 1 | 2 | 3): number {
  return Math.max(
    ACHIEVEMENT_REWARDS.minGold,
    Math.round(enemyMaxHp(state.enemy.level, 0) * ACHIEVEMENT_REWARDS.goldPerTier[tier]),
  );
}

/** Unlocks every achievement whose target is reached, and pays its gold reward. */
export function checkAchievements(state: GameState): {
  state: GameState;
  unlocked: { id: string; name: string; gold: number }[];
} {
  const unlocked: { id: string; name: string; gold: number }[] = [];
  let next = state;
  for (const a of ACHIEVEMENTS) {
    if (next.achievements.includes(a.id)) continue;
    const { current, target } = a.progress(next);
    if (current < target) continue;
    const gold = achievementGold(next, a.tier);
    next = { ...next, gold: next.gold + gold, achievements: [...next.achievements, a.id] };
    unlocked.push({ id: a.id, name: a.name, gold });
  }
  return { state: next, unlocked };
}
