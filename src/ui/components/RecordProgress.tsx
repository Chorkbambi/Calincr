import { StyleSheet, Text, View } from 'react-native';

import type { ExerciseId } from '../../game';
import { formatAmount } from '../format';
import { colors, fonts, spacing } from '../theme';
import { ProgressBar } from './ProgressBar';

/** Live "beat your record" bar during a set: 12 / 18 · 6 to go, then 🏅 when beaten. */
export function RecordProgress({ exerciseId, amount, best }: { exerciseId: ExerciseId; amount: number; best: number }) {
  if (best <= 0) return null;
  const left = best + 1 - amount;
  const beaten = amount > best;
  const text = beaten
    ? `🏅 New record! ${formatAmount(exerciseId, amount)} (was ${formatAmount(exerciseId, best)})`
    : left <= 3
      ? `🏅 Record in ${formatAmount(exerciseId, left)}! Keep going!`
      : `Record: ${formatAmount(exerciseId, best)} · ${formatAmount(exerciseId, left)} to beat it`;
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={[styles.text, (beaten || left <= 3) && styles.hot]}>{text}</Text>
      <ProgressBar progress={Math.min(1, amount / (best + 1))} color={beaten ? colors.rested : colors.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.xs },
  text: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 14 },
  hot: { color: colors.goldLight, fontFamily: fonts.titleBold },
});
