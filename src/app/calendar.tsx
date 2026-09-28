import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  addDays,
  EXERCISES,
  getExercise,
  monthGrid,
  startOfWeek,
  summarizeByDay,
  toDayKey,
  totalsByExercise,
  totalsByWeek,
  type DayKey,
  type ExerciseTotals,
  type SetRecord,
} from '../game';
import { useGame } from '../state/GameProvider';
import { ExerciseProgressPanel } from '../ui/components/ExerciseProgressPanel';
import { Panel } from '../ui/components/Panel';
import {
  formatAmount,
  formatDayLong,
  formatDayShort,
  formatMultiplier,
  formatNumber,
  formatTime,
  MONTH_NAMES,
  WEEKDAY_SHORT,
} from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';

function TotalsList({ totals }: { totals: ExerciseTotals }) {
  const rows = EXERCISES.filter((e) => (totals[e.id] ?? 0) > 0);
  if (rows.length === 0) return <Text style={styles.muted}>No activity.</Text>;
  return (
    <>
      {rows.map((e) => (
        <View key={e.id} style={styles.row}>
          <Text style={styles.text}>{e.name}</Text>
          <Text style={styles.value}>{formatAmount(e.id, totals[e.id] ?? 0)}</Text>
        </View>
      ))}
    </>
  );
}

function SetLine({ set }: { set: SetRecord }) {
  const xp = Object.values(set.xpByMuscle).reduce((sum, v) => sum + (v ?? 0), 0);
  const multipliers = [...new Set(Object.values(set.multiplierByMuscle))].map((m) => formatMultiplier(m ?? 1));
  return (
    <View style={styles.setLine}>
      <View style={styles.row}>
        <Text style={styles.text}>
          {formatTime(set.startedAt)} · {getExercise(set.exerciseId).name}
        </Text>
        <Text style={styles.value}>{formatAmount(set.exerciseId, set.amount)}</Text>
      </View>
      <Text style={styles.detail}>
        +{formatNumber(xp)} XP · multiplier {multipliers.join(' / ')} · {formatNumber(set.damage)} damage
      </Text>
    </View>
  );
}

export default function CalendarScreen() {
  const { repository, dataVersion } = useGame();
  const today = toDayKey(new Date());
  const [month, setMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }));
  const [selected, setSelected] = useState<DayKey>(today);
  const [sets, setSets] = useState<SetRecord[]>([]);

  const grid = useMemo(() => monthGrid(month.year, month.month), [month]);
  const firstDay = grid.flat().find((d): d is DayKey => d !== null) ?? today;
  const lastDay = [...grid.flat()].reverse().find((d): d is DayKey => d !== null) ?? today;
  // Load whole weeks so weekly totals stay correct at month edges.
  const from = startOfWeek(firstDay);
  const to = addDays(startOfWeek(lastDay), 6);

  useEffect(() => {
    let cancelled = false;
    repository.listSets(from, to).then((rows) => {
      if (!cancelled) setSets(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, dataVersion, from, to]);

  const days = useMemo(() => summarizeByDay(sets), [sets]);
  const monthSets = useMemo(() => sets.filter((s) => s.day >= firstDay && s.day <= lastDay), [sets, firstDay, lastDay]);
  const weeks = useMemo(() => totalsByWeek(sets), [sets]);
  const selectedDay = days.get(selected);

  const shiftMonth = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const index = year * 12 + (m - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Previous month">
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[month.month - 1]} {month.year}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12} accessibilityLabel="Next month">
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <Panel>
          <View style={styles.week}>
            {WEEKDAY_SHORT.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>
          {grid.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((day, i) => {
                if (!day) return <View key={i} style={styles.cell} />;
                const intensity = days.get(day)?.intensity ?? 0;
                const isSelected = day === selected;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelected(day)}
                    accessibilityLabel={formatDayLong(day)}
                    style={[
                      styles.cell,
                      styles.dayCell,
                      { backgroundColor: colors.heat[intensity] },
                      day === today && styles.today,
                      isSelected && styles.selected,
                    ]}
                  >
                    <Text style={[styles.dayNumber, intensity >= 3 && styles.dayNumberDark]}>
                      {Number(day.slice(8))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.legend}>
            <Text style={styles.muted}>Less</Text>
            {colors.heat.map((c) => (
              <View key={c} style={[styles.legendBox, { backgroundColor: c }]} />
            ))}
            <Text style={styles.muted}>More</Text>
          </View>
        </Panel>

        <Panel title={formatDayLong(selected)}>
          {selectedDay ? selectedDay.sets.map((s) => <SetLine key={s.id} set={s} />) : <Text style={styles.muted}>Rest day.</Text>}
          {selectedDay ? (
            <View style={styles.dayTotals}>
              <TotalsList totals={totalsByExercise(selectedDay.sets)} />
            </View>
          ) : null}
        </Panel>

        <Panel title={`${MONTH_NAMES[month.month - 1]} total`}>
          <TotalsList totals={totalsByExercise(monthSets)} />
        </Panel>

        <ExerciseProgressPanel today={today} />

        <Panel title="By week">
          {weeks.length === 0 ? <Text style={styles.muted}>No activity.</Text> : null}
          {weeks.map((w) => (
            <View key={w.weekStart} style={styles.weekBlock}>
              <Text style={styles.weekTitle}>
                Week of {formatDayShort(w.weekStart)}
              </Text>
              <TotalsList totals={w.totals} />
            </View>
          ))}
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 22 },
  arrow: { color: colors.gold, fontSize: 36, paddingHorizontal: spacing.md },
  week: { flexDirection: 'row', gap: 4 },
  weekday: { flex: 1, textAlign: 'center', color: colors.textMuted, fontFamily: fonts.title, fontSize: 12 },
  cell: { flex: 1, aspectRatio: 1 },
  dayCell: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  today: { borderColor: colors.parchmentDark },
  selected: { borderColor: colors.goldLight, borderWidth: 2 },
  dayNumber: { color: colors.text, fontFamily: fonts.body, fontSize: 13 },
  dayNumberDark: { color: colors.ink, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: spacing.xs },
  legendBox: { width: 12, height: 12, borderRadius: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 14, flexShrink: 1 },
  value: { color: colors.goldLight, fontFamily: fonts.body, fontSize: 14, fontVariant: ['tabular-nums'] },
  detail: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 },
  muted: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  setLine: { gap: 2, paddingVertical: spacing.xs, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  dayTotals: { marginTop: spacing.sm, gap: 2 },
  weekBlock: { gap: 2, paddingVertical: spacing.xs },
  weekTitle: { color: colors.parchmentDark, fontFamily: fonts.title, fontSize: 13 },
});
