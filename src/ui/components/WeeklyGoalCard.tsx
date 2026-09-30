import { StyleSheet, Text, View } from 'react-native';

import { rollWeeklyGoal, weeklyGoalGold, type DayKey, type GameState } from '../../game';
import { formatNumber } from '../format';
import { colors, fonts, radius, spacing } from '../theme';

/** "📅 Weekly goal ●●○ 2/3 days · 🔥 4 weeks in a row": the streak counts weeks, rest days are fine. */
export function WeeklyGoalCard({ state, today }: { state: GameState; today: DayKey }) {
  const { weekly } = rollWeeklyGoal(state, today);
  const done = Math.min(weekly.days.length, weekly.goal);
  const dots = '●'.repeat(done) + '○'.repeat(weekly.goal - done);
  return (
    <View style={[styles.box, weekly.rewarded && styles.met]}>
      <View style={styles.row}>
        <Text style={styles.title}>📅 Weekly goal</Text>
        <Text style={styles.dots} accessibilityLabel={`${weekly.days.length} of ${weekly.goal} training days this week`}>
          {dots} {weekly.days.length}/{weekly.goal} days
        </Text>
      </View>
      <Text style={styles.muted}>
        {weekly.rewarded
          ? '✓ Goal met this week! Rest well, the streak is safe.'
          : `Train ${weekly.goal - done} more day${weekly.goal - done > 1 ? 's' : ''} this week · +${formatNumber(weeklyGoalGold(state))} gold`}
      </Text>
      {weekly.streak > 0 ? (
        <Text style={styles.streak}>
          🔥 {weekly.streak} week{weekly.streak > 1 ? 's' : ''} in a row{state.streakFreezes > 0 ? ` · 🧊 ${state.streakFreezes}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.stone },
  met: { borderColor: colors.rested },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 15 },
  dots: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 15, letterSpacing: 1 },
  muted: { color: colors.textMuted, fontSize: 13 },
  streak: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 14 },
});
