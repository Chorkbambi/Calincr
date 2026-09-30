import { PROGRESSIONS, SKILLS, TIER_UP, type ExerciseId, type SkillConfig } from './config';
import { getExercise } from './exercises';

export type Records = Partial<Record<ExerciseId, number>>;

/**
 * The harder variation to try next, once the best set of `exerciseId` reaches TIER_UP
 * (and the next one isn't mastered already). Null when there is nothing to suggest.
 */
export function nextVariation(exerciseId: ExerciseId, records: Records): ExerciseId | null {
  const chain = PROGRESSIONS.find((c) => c.includes(exerciseId));
  if (!chain) return null;
  const next = chain[chain.indexOf(exerciseId) + 1];
  if (!next) return null;
  const threshold = (id: ExerciseId) => TIER_UP[getExercise(id).unit];
  if ((records[exerciseId] ?? 0) < threshold(exerciseId)) return null;
  if ((records[next] ?? 0) >= threshold(next)) return null;
  return next;
}

export interface SkillProgress {
  skill: SkillConfig;
  /** Steps reached, in order (a step counts only once the previous ones are reached). */
  done: number;
  complete: boolean;
}

export function skillProgress(records: Records): SkillProgress[] {
  return SKILLS.map((skill) => {
    let done = 0;
    while (done < skill.steps.length && (records[skill.steps[done]!.exerciseId] ?? 0) >= skill.steps[done]!.amount) done++;
    return { skill, done, complete: done === skill.steps.length };
  });
}

/** Skill steps newly reached between two sets of records (for the "skill step" message). */
export function newSkillSteps(before: Records, after: Records): { name: string; icon: string; done: number; total: number }[] {
  const was = skillProgress(before);
  return skillProgress(after)
    .filter((p, i) => p.done > was[i]!.done)
    .map((p) => ({ name: p.skill.name, icon: p.skill.icon, done: p.done, total: p.skill.steps.length }));
}
