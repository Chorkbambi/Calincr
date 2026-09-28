import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';

import {
  addDays,
  getExercise,
  MUSCLE_NAMES,
  ONBOARDING_VERSION,
  parseDayKey,
  startOfWeek,
  toDayKey,
  weeklyRecap,
  type WeeklyRecap,
} from '../../game';
import { cancelDailyReminder, scheduleDailyReminder } from '../../notifications/reminders';
import { useGame } from '../../state/GameProvider';
import { formatAmount, formatDayShort, formatDuration, formatNumber } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';

/** Shows last week's summary once, the first time the app is opened in a new week. */
export function WeeklyRecapModal() {
  const { settings, updateSettings, repository } = useGame();
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
    <Modal visible transparent animationType="fade" onRequestClose={() => setRecap(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Your week</Text>
          <Text style={styles.muted}>
            {formatDayShort(recap.weekStart)} – {formatDayShort(addDays(recap.weekStart, 6))}
          </Text>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
          <Text style={styles.text}>
            {recap.activeDays >= 4 ? 'What a week! Keep it up, hero.' : 'Every rep counts. A new week, new monsters!'}
          </Text>
          <GoldButton label="Onward!" onPress={() => setRecap(null)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.stone,
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 15, flexShrink: 1 },
  value: { color: colors.parchment, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  text: { color: colors.text, fontSize: 15, marginVertical: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
});
