import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getExercise, monthSummary, type DayKey, type SetRecord } from '../../game';
import { useGame } from '../../state/GameProvider';
import { formatAmount, formatDuration, formatNumber, MONTH_NAMES } from '../format';
import { colors, fonts, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { Panel } from './Panel';
import { ShareCardModal, type ShareCardData } from './ShareCardModal';

/** "Hero passport" of a month: days, volume, top exercise and records beaten, shareable as a picture. */
export function MonthSummaryPanel({ year, month, lastDay }: { year: number; month: number; lastDay: DayKey }) {
  const { repository, dataVersion } = useGame();
  const focused = useIsFocused();
  const [sets, setSets] = useState<SetRecord[]>([]);
  const [card, setCard] = useState<ShareCardData | null>(null);
  const key = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    // Only while the Calendar tab is shown: not after every rep of the fight.
    if (!focused) return undefined;
    let cancelled = false;
    // Earlier months are needed to know which records were beaten this month.
    repository.listSets('2000-01-01', lastDay).then((rows) => {
      if (!cancelled) setSets(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, dataVersion, lastDay, focused]);

  const summary = useMemo(() => monthSummary(sets, key), [sets, key]);
  const name = `${MONTH_NAMES[month - 1]} ${year}`;
  if (summary.sets === 0) {
    return (
      <Panel title={`${name} summary`}>
        <Text style={styles.muted}>No training this month yet.</Text>
      </Panel>
    );
  }
  const rows: [string, string][] = [
    ['Training days', formatNumber(summary.activeDays)],
    ['Sets', formatNumber(summary.sets)],
    ['Reps', formatNumber(summary.reps)],
    ...(summary.holdSeconds > 0 ? ([['Holds', formatDuration(summary.holdSeconds)]] as [string, string][]) : []),
    ...(summary.topExercise ? ([['Favourite', getExercise(summary.topExercise).name]] as [string, string][]) : []),
    ['Records beaten', formatNumber(summary.records.length)],
  ];

  return (
    <Panel title={`${name} summary`}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.text}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
      {summary.records.map((r) => (
        <Text key={r.exerciseId} style={styles.record}>
          🏅 {getExercise(r.exerciseId).name}: {formatAmount(r.exerciseId, r.previous)} → {formatAmount(r.exerciseId, r.best)}
        </Text>
      ))}
      <GoldButton
        label="Share this month"
        variant="stone"
        onPress={() => setCard({ badge: '📜', title: `${name}`, subtitle: 'My training month', rows })}
      />
      <ShareCardModal card={card} onClose={() => setCard(null)} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  text: { color: colors.text, fontSize: 14 },
  value: { color: colors.goldLight, fontSize: 14, fontVariant: ['tabular-nums'] },
  record: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 13 },
});
