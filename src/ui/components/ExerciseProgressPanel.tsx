import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { EXERCISES, weeklyProgress, type DayKey, type ExerciseId } from '../../game';
import { useGame } from '../../state/GameProvider';
import { formatAmount, formatDayShort } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { Panel } from './Panel';
import { ProgressChart } from './ProgressChart';

const WEEKS = 12;

/** Weekly total and best set of one exercise over the last 12 weeks. */
export function ExerciseProgressPanel({ today }: { today: DayKey }) {
  const { repository, dataVersion, state } = useGame();
  const [trained, setTrained] = useState<ExerciseId[]>([]);
  const [exerciseId, setExerciseId] = useState<ExerciseId | null>(null);
  const [days, setDays] = useState<{ day: DayKey; total: number; best: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    repository.bestSetByExercise().then((best) => {
      if (cancelled) return;
      const ids = EXERCISES.map((e) => e.id as ExerciseId).filter((id) => (best[id] ?? 0) > 0);
      setTrained(ids);
      setExerciseId((current) => (current && ids.includes(current) ? current : (ids[0] ?? null)));
    });
    return () => {
      cancelled = true;
    };
  }, [repository, dataVersion]);

  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    repository.exerciseDays(exerciseId).then((rows) => {
      if (!cancelled) setDays(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, dataVersion, exerciseId]);

  const weeks = useMemo(() => weeklyProgress(days, today, WEEKS), [days, today]);

  if (!exerciseId) {
    return (
      <Panel title="Progress">
        <Text style={styles.muted}>Train an exercise to see your progress here.</Text>
      </Panel>
    );
  }
  const format = (v: number) => formatAmount(exerciseId, Math.round(v));
  const points = (key: 'volume' | 'best') =>
    weeks.map((w) => ({ label: formatDayShort(w.weekStart), title: `Week of ${formatDayShort(w.weekStart)}`, value: w[key] }));
  const record = state.records[exerciseId];
  const unit = EXERCISES.find((e) => e.id === exerciseId)?.unit === 'seconds' ? 'seconds' : 'reps';

  return (
    <Panel title="Progress">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {trained.map((id) => {
          const selected = id === exerciseId;
          return (
            <Pressable
              key={id}
              onPress={() => setExerciseId(id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {EXERCISES.find((e) => e.id === id)?.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {record ? <Text style={styles.record}>🏅 Record: {format(record)} in one set</Text> : null}
      <Text style={styles.chartTitle}>Total per week ({unit})</Text>
      <ProgressChart points={points('volume')} kind="bar" format={format} />
      <Text style={styles.chartTitle}>Best set per week ({unit})</Text>
      <ProgressChart points={points('best')} kind="line" format={format} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13 },
  chips: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.stoneLight,
  },
  chipSelected: { borderColor: colors.gold },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextSelected: { color: colors.goldLight },
  record: { color: colors.goldLight, fontSize: 14, marginBottom: spacing.sm },
  chartTitle: { color: colors.parchment, fontFamily: fonts.title, fontSize: 14, marginTop: spacing.sm },
});
