/** Local calendar day, formatted YYYY-MM-DD. */
export type DayKey = string;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Day key in the phone's local time zone. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(day: DayKey): { year: number; month: number; day: number } {
  const [year, month, d] = day.split('-').map(Number);
  if (year === undefined || month === undefined || d === undefined) {
    throw new Error(`Invalid day key: ${day}`);
  }
  return { year, month, day: d };
}

/** Days since the Unix epoch for a calendar day (DST-proof, time-zone independent). */
function epochDay(day: DayKey): number {
  const { year, month, day: d } = parseDayKey(day);
  return Math.round(Date.UTC(year, month - 1, d) / 86_400_000);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return epochDay(to) - epochDay(from);
}

export function addDays(day: DayKey, amount: number): DayKey {
  const { year, month, day: d } = parseDayKey(day);
  const date = new Date(Date.UTC(year, month - 1, d + amount));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMondayFirst(day: DayKey): number {
  const { year, month, day: d } = parseDayKey(day);
  return (new Date(Date.UTC(year, month - 1, d)).getUTCDay() + 6) % 7;
}

/** Monday of the week containing `day`; used as the week key. */
export function startOfWeek(day: DayKey): DayKey {
  return addDays(day, -weekdayMondayFirst(day));
}

/** YYYY-MM */
export function monthKey(day: DayKey): string {
  return day.slice(0, 7);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
