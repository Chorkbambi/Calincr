import { getExercise, type ExerciseId, type RecoveryStatus } from '../game';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatNumber(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [int = '0', frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** 1234567 → "1.23M" for big gold amounts. */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value);
}

export function formatMultiplier(multiplier: number): string {
  const text = Number.isInteger(multiplier) ? formatNumber(multiplier) : formatNumber(multiplier, 2).replace(/0$/, '');
  return `×${text}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

export function formatAmount(exerciseId: ExerciseId, amount: number): string {
  return getExercise(exerciseId).unit === 'seconds' ? formatDuration(amount) : `${amount} reps`;
}

export const STATUS_LABELS: Record<RecoveryStatus, string> = {
  tired: 'Tired',
  ready: 'Ready',
  rested: 'Rested',
};

/** "Monday, September 28" from YYYY-MM-DD */
export function formatDayLong(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
  return `${WEEKDAYS[date.getDay()]}, ${MONTH_NAMES[(m ?? 1) - 1]} ${d}`;
}

/** "September 28" */
export function formatDayShort(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${d}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** yyyy-mm-dd in local time */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Rest timer choice: 0 → "No timer", 90 → "1 min 30". */
export function restTimerLabel(seconds: number): string {
  if (seconds === 0) return 'No timer';
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}`;
}

/** 7, 5 → "07:05". */
export function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
