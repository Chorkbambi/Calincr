import { StyleSheet, Text, View } from 'react-native';

import { ACHIEVEMENTS, achievementGold, type GameState } from '../../game';
import { formatNumber } from '../format';
import { colors, fonts, spacing } from '../theme';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';

/** Unlocked achievements first, then the others with their progress and gold reward. */
export function AchievementsPanel({ state }: { state: GameState }) {
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements.includes(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !state.achievements.includes(a.id));
  return (
    <Panel title={`Achievements · ${unlocked.length} / ${ACHIEVEMENTS.length}`}>
      {[...unlocked, ...locked].map((a) => {
        const done = state.achievements.includes(a.id);
        const { current, target } = a.progress(state);
        return (
          <View key={a.id} style={[styles.row, !done && styles.locked]} accessible accessibilityLabel={`${a.name}. ${a.description}${done ? ' Unlocked.' : ` ${current} of ${target}.`}`}>
            <Text style={styles.icon}>{done ? '🏆' : '🔒'}</Text>
            <View style={styles.body}>
              <Text style={[styles.name, done && styles.nameDone]}>{a.name}</Text>
              <Text style={styles.description}>{a.description}</Text>
              {!done && (
                <>
                  <ProgressBar progress={target > 0 ? current / target : 0} height={6} />
                  <Text style={styles.muted}>
                    {formatNumber(current)} / {formatNumber(target)} · reward {formatNumber(achievementGold(state, a.tier))} gold
                  </Text>
                </>
              )}
            </View>
          </View>
        );
      })}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 6 },
  locked: { opacity: 0.8 },
  icon: { fontSize: 22, width: 30, textAlign: 'center' },
  body: { flex: 1, gap: 3 },
  name: { color: colors.text, fontFamily: fonts.title, fontSize: 15 },
  nameDone: { color: colors.goldLight },
  description: { color: colors.text, fontSize: 13 },
  muted: { color: colors.textMuted, fontSize: 12 },
});
