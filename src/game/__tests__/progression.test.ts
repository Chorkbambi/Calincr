import { PROGRESSION } from '../config';
import { addXp, xpForNextLevel } from '../progression';

describe('xpForNextLevel', () => {
  it('follows round(50 × level^1.6)', () => {
    expect(xpForNextLevel(1)).toBe(50);
    expect(xpForNextLevel(2)).toBe(Math.round(50 * 2 ** 1.6)); // 152
    expect(xpForNextLevel(2)).toBe(152);
    expect(xpForNextLevel(10)).toBe(Math.round(50 * 10 ** 1.6)); // 1990
  });

  it('reads its parameters from config', () => {
    const level = 7;
    expect(xpForNextLevel(level)).toBe(
      Math.round(PROGRESSION.xpCurveBase * level ** PROGRESSION.xpCurveExponent),
    );
  });

  it('is strictly increasing', () => {
    for (let level = 1; level < 100; level++) {
      expect(xpForNextLevel(level + 1)).toBeGreaterThan(xpForNextLevel(level));
    }
  });
});

describe('addXp', () => {
  it('accumulates XP without leveling up below the threshold', () => {
    expect(addXp({ level: 1, xp: 0 }, 49)).toEqual({ level: 1, xp: 49 });
  });

  it('levels up exactly at the threshold', () => {
    expect(addXp({ level: 1, xp: 0 }, 50)).toEqual({ level: 2, xp: 0 });
  });

  it('carries the extra XP over and handles several levels at once', () => {
    // 50 (1→2) + 152 (2→3) = 202, 10 left over
    expect(addXp({ level: 1, xp: 0 }, 212)).toEqual({ level: 3, xp: 10 });
  });

  it('keeps fractional XP', () => {
    const p = addXp({ level: 1, xp: 0.5 }, 2.25);
    expect(p.level).toBe(1);
    expect(p.xp).toBeCloseTo(2.75);
  });
});
