import { restoreSettings } from '../settings';
import { voiceCountPhrase } from '../voice';

describe('voiceCountPhrase', () => {
  it('says the new rep total of the set', () => {
    expect(voiceCountPhrase('reps', 0, 1)).toBe('1');
    expect(voiceCountPhrase('reps', 11, 12)).toBe('12');
  });

  it('says only the final total of a burst', () => {
    expect(voiceCountPhrase('reps', 10, 15)).toBe('15');
  });

  it('says nothing when the total did not grow', () => {
    expect(voiceCountPhrase('reps', 5, 5)).toBeNull();
  });

  it('announces holds every 10 seconds only', () => {
    expect(voiceCountPhrase('seconds', 0, 9)).toBeNull();
    expect(voiceCountPhrase('seconds', 9, 10)).toBe('10 seconds');
    expect(voiceCountPhrase('seconds', 10, 19)).toBeNull();
    expect(voiceCountPhrase('seconds', 18, 45)).toBe('40 seconds');
  });
});

describe('voiceCount setting', () => {
  it('is off by default and restored from a save', () => {
    expect(restoreSettings({}).voiceCount).toBe(false);
    expect(restoreSettings({ voiceCount: true }).voiceCount).toBe(true);
    expect(restoreSettings({ voiceCount: 'yes' }).voiceCount).toBe(false);
  });
});
