import { EXERCISES, PROGRESSIONS, SKILLS } from '../config';
import { newSkillSteps, nextVariation, skillProgress } from '../skills';

describe('nextVariation', () => {
  it('suggests the harder variation once the best set reaches 15 reps (60 s for holds)', () => {
    expect(nextVariation('squat', { squat: 14 })).toBeNull();
    expect(nextVariation('squat', { squat: 15 })).toBe('bulgarian_split_squat');
    expect(nextVariation('plank', { plank: 60 })).toBe('hollow_hold');
  });

  it('says nothing at the end of a chain, off-chain, or when the next one is already mastered', () => {
    expect(nextVariation('diamond_pushup', { diamond_pushup: 40 })).toBeNull();
    expect(nextVariation('jump_squat', { jump_squat: 40 })).toBeNull();
    expect(nextVariation('pushup', { pushup: 20, diamond_pushup: 15 })).toBeNull();
  });

  it('only chains exercises of the same unit, each in one chain', () => {
    const unit = (id: string) => EXERCISES.find((e) => e.id === id)!.unit;
    for (const chain of PROGRESSIONS) expect(new Set(chain.map(unit)).size).toBe(1);
    const all = PROGRESSIONS.flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('skills', () => {
  it('counts steps in order from the records', () => {
    const push = (records: Record<string, number>) => skillProgress(records).find((p) => p.skill.id === 'pushup_master')!;
    expect(push({}).done).toBe(0);
    expect(push({ knee_pushup: 12, pushup: 26 }).done).toBe(3);
    // A later step alone doesn't count before the earlier ones.
    expect(push({ pushup: 60 }).done).toBe(0);
    expect(push({ knee_pushup: 10, pushup: 50 }).complete).toBe(true);
  });

  it('reports newly reached steps', () => {
    expect(newSkillSteps({ knee_pushup: 10 }, { knee_pushup: 10, pushup: 10 })).toEqual([
      { name: 'Push-up Master', icon: '🛡️', done: 2, total: 4 },
    ]);
    expect(newSkillSteps({ pushup: 3 }, { pushup: 4 })).toEqual([]);
  });

  it('uses known exercises and growing steps', () => {
    for (const skill of SKILLS) {
      expect(skill.steps.length).toBeGreaterThan(1);
      for (const step of skill.steps) expect(EXERCISES.some((e) => e.id === step.exerciseId)).toBe(true);
    }
  });
});
