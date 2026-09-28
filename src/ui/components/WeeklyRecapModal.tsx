import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  addDays,
  getExercise,
  MUSCLE_NAMES,
  ONBOARDING_VERSION,
  parseDayKey,
  startOfWeek,
  toDayKey,
  weeklyRecap,
  WEAPONS,
  type WeeklyRecap,
} from '../../game';
import { cancelDailyReminder, scheduleDailyReminder } from '../../notifications/reminders';
import { useGame } from '../../state/GameProvider';
import { formatAmount, formatDayShort, formatDuration, formatNumber } from '../format';
import { ShareCardModal } from './ShareCardModal';

/** Shows last week's summary once, the first time the app is opened in a new week. */
export function WeeklyRecapModal() {
  const { settings, updateSettings, repository, state } = useGame();
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const checking = useRef(false);
  const onboarded = settings.onboardingVersion >= ONBOARDING_VERSION;

  const check = useCallback(async () => {
    if (!onboarded || checking.current) return;
    const lastWeek = addDays(startOfWeek(toDayKey(new Date())), -7);
    if (settings.lastRecapWeek !== null && settings.lastRecapWeek >= lastWeek) return;
    checking.current = true;
    try {
      const { year, month, day } = parseDayKey(lastWeek);
      const [sets, kills] = await Promise.all([
        repository.listSets(lastWeek, addDays(lastWeek, 6)),
        repository.listKillsSince(new Date(year, month - 1, day).toISOString()),
      ]);
      const result = weeklyRecap(lastWeek, sets, kills, (iso) => toDayKey(new Date(iso)));
      if (result.activeDays > 0) setRecap(result);
      updateSettings({ lastRecapWeek: lastWeek });
    } catch {
      // A recap is a bonus: never block the app for it.
    } finally {
      checking.current = false;
    }
  }, [onboarded, settings.lastRecapWeek, repository, updateSettings]);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void check());
    return () => sub.remove();
  }, [check]);

  // At startup, puts the scheduled reminder back in line with the settings (after a reinstall or a backup import).
  // Later changes are scheduled by the Settings screen, which also reports a refused permission.
  const initialReminder = useRef(settings.reminder);
  useEffect(() => {
    const { enabled, hour, minute } = initialReminder.current;
    if (enabled) void scheduleDailyReminder(hour, minute);
    else void cancelDailyReminder();
  }, []);

  if (!recap) return null;
  const rows: [string, string][] = [
    ['Active days', `${recap.activeDays} / 7`],
    ['Reps', formatNumber(recap.reps)],
  ];
  if (recap.holdSeconds > 0) rows.push(['Time holding', formatDuration(recap.holdSeconds)]);
  rows.push(['Monsters defeated', formatNumber(recap.kills)]);
  if (recap.bosses > 0) rows.push(['Bosses defeated', formatNumber(recap.bosses)]);
  if (recap.topExercise)
    rows.push([
      'Favourite exercise',
      `${getExercise(recap.topExercise.exerciseId).name} (${formatAmount(recap.topExercise.exerciseId, recap.topExercise.amount)})`,
    ]);
  if (recap.topMuscle) rows.push(['Most trained muscle', MUSCLE_NAMES[recap.topMuscle]]);

  return (
    <ShareCardModal
      card={{
        badge: '📅',
        title: 'My week',
        subtitle: `${formatDayShort(recap.weekStart)} – ${formatDayShort(addDays(recap.weekStart, 6))}`,
        rows,
        footer: recap.activeDays >= 4 ? 'What a week! Keep it up, hero.' : 'Every rep counts. A new week, new monsters!',
      }}
      swordTier={Math.max(0, WEAPONS.findIndex((w) => w.id === state.weaponId))}
      closeLabel="Onward!"
      onClose={() => setRecap(null)}
    />
  );
}
