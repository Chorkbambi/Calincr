import { getExercise, type ExerciseId, type RecoveryStatus } from '../game';

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
export const WEEKDAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function formatNumber(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [int = '0', frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac ? `${grouped},${frac}` : grouped;
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
  return getExercise(exerciseId).unit === 'seconds' ? formatDuration(amount) : `${amount} rép.`;
}

export const STATUS_LABELS: Record<RecoveryStatus, string> = {
  tired: 'Fatigué',
  ready: 'Prêt',
  rested: 'Reposé',
};

/** "lundi 28 septembre" from YYYY-MM-DD */
export function formatDayLong(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
  const weekday = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
  return `${weekday} ${d} ${(MONTH_NAMES[(m ?? 1) - 1] ?? '').toLowerCase()}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** dd/mm/yyyy in local time */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
