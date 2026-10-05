import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { ProgressBar } from './ProgressBar';

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Countdown between two sets. The workout (useWorkout) decides when it ends; this only shows it. */
export function RestTimer({
  secondsLeft,
  seconds,
  next,
  onSkip,
}: {
  secondsLeft: number;
  seconds: number;
  /** What comes after the rest, e.g. "Next: set 2 of 3 · 10 reps". */
  next: string;
  onSkip?: () => void;
}) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={styles.label}>Rest</Text>
        <Text style={styles.time}>{clock(secondsLeft)}</Text>
      </View>
      <ProgressBar progress={seconds > 0 ? 1 - secondsLeft / seconds : 1} color={colors.gold} />
      <Text style={styles.next}>{next}</Text>
      {onSkip ? <GoldButton label="Skip rest" variant="stone" onPress={onSkip} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDark,
    backgroundColor: 'rgba(42,35,28,0.95)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 16 },
  time: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 28, fontVariant: ['tabular-nums'] },
  next: { color: colors.textMuted, fontSize: 13 },
});
