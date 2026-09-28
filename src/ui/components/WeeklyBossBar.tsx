import { StyleSheet, Text, View } from 'react-native';

import { currentWeeklyBoss, weeklyBossGold, type GameState } from '../../game';
import { formatCompact, formatNumber } from '../format';
import { colors, fonts, spacing } from '../theme';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';

/** This week's giant: every hit of the week damages it. */
export function WeeklyBossBar({ state, today }: { state: GameState; today: string }) {
  const boss = currentWeeklyBoss(state, today);
  return (
    <Panel>
      <View style={styles.row}>
        <Text style={styles.title}>👑 Weekly Titan</Text>
        <Text style={styles.reward}>{boss.defeated ? 'Defeated ✓' : `🪙 ${formatCompact(weeklyBossGold(state))}`}</Text>
      </View>
      <ProgressBar progress={boss.hp / boss.maxHp} color={colors.blood} height={10} />
      <Text style={styles.muted}>
        {boss.defeated
          ? 'A new titan arrives on Monday.'
          : `${formatNumber(boss.hp)} / ${formatNumber(boss.maxHp)} HP · every hit this week counts · resets on Monday`}
      </Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 16 },
  reward: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
