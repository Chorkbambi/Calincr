import { DIFFICULTY_NAMES, type Difficulty } from '../game';

/** Difficulty modes as offered in Settings and on the welcome screen. */
export const DIFFICULTY_CHOICES: { value: Difficulty; label: string; description: string }[] = [
  { value: 'beginner', label: DIFFICULTY_NAMES.beginner, description: 'Simplified exercises: wall and knee push-ups, chair squats…' },
  { value: 'normal', label: DIFFICULTY_NAMES.normal, description: 'Classic exercises: push-ups, squats, lunges, plank…' },
  {
    value: 'advanced',
    label: DIFFICULTY_NAMES.advanced,
    description: 'Classic exercises plus hard ones: pull-ups, dips, pistol squats…',
  },
];
