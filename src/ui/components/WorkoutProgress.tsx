import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { currentSetAmount, currentSetNumber, getExercise, restSecondsLeft, type Workout } from '../../game';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { ProgressBar } from './ProgressBar';
import { clock, RestTimer } from './RestTimer';

/** Current time, refreshed a few times a second while `running` (the rest countdown). */
function useClock(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

const unitLabel = (seconds: boolean, n: number) => (seconds ? `${n} s` : `${n} rep${n === 1 ? '' : 's'}`);

/**
 * Where the player is in the exercise: set 2 of 3, 7 / 10 reps, or the rest countdown.
 * `compact` is the camera version: big numbers, no buttons, readable from a few metres.
 */
export function WorkoutProgress({
  workout,
  compact = false,
  onFinishSet,
  onEnd,
  onSkipRest,
  largeButtons = false,
}: {
  workout: Workout;
  compact?: boolean;
  onFinishSet?: () => void;
  onEnd?: () => void;
  onSkipRest?: () => void;
  largeButtons?: boolean;
}) {
  const seconds = getExercise(workout.exerciseId).unit === 'seconds';
  const { sets, perSet, restSeconds } = workout.plan;
  const number = currentSetNumber(workout);
  const amount = currentSetAmount(workout);
  const resting = workout.phase === 'rest';
  const now = useClock(resting);
  const left = restSecondsLeft(workout, now);
  const next = `Next: ${number === sets ? 'last set' : `set ${number} of ${sets}`} · ${unitLabel(seconds, perSet)}`;
  const done = workout.amounts.slice(0, resting ? undefined : -1);

  if (compact) {
    return (
      <View style={styles.compact} accessibilityLiveRegion="polite">
        {resting ? (
          <>
            <Text style={styles.compactLabel}>Rest</Text>
            <Text style={styles.compactBig}>{clock(left)}</Text>
            <Text style={styles.compactLabel}>{next}</Text>
          </>
        ) : (
          <>
            <Text style={styles.compactLabel}>
              Set {number} / {sets}
            </Text>
            <Text style={styles.compactBig}>
              {amount}
              <Text style={styles.compactTarget}> / {seconds ? `${perSet} s` : perSet}</Text>
            </Text>
            <View style={styles.compactBar}>
              <ProgressBar progress={amount / perSet} color={colors.gold} />
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.box}>
      {resting ? (
        <RestTimer secondsLeft={left} seconds={restSeconds} next={next} onSkip={onSkipRest} />
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.title}>
              Set {number} of {sets}
            </Text>
            <Text style={styles.amount}>
              {unitLabel(seconds, amount)} <Text style={styles.muted}>/ {unitLabel(seconds, perSet)}</Text>
            </Text>
          </View>
          <ProgressBar progress={amount / perSet} color={colors.gold} />
        </>
      )}
      {done.length > 0 ? (
        <Text style={styles.muted}>Done: {done.map((a) => `✓ ${unitLabel(seconds, a)}`).join(' · ')}</Text>
      ) : null}
      <View style={styles.buttons}>
        {onFinishSet && !resting && amount > 0 ? (
          <GoldButton
            label={number === sets ? 'Finish exercise' : 'Finish set'}
            variant="stone"
            onPress={onFinishSet}
            style={[styles.flex, largeButtons && styles.large]}
          />
        ) : null}
        {onEnd && (resting || number < sets || amount === 0) ? (
          <GoldButton label="End exercise" variant="stone" onPress={onEnd} style={[styles.flex, largeButtons && styles.large]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stone,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 16 },
  amount: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 18, fontVariant: ['tabular-nums'] },
  muted: { color: colors.textMuted, fontSize: 13, fontFamily: undefined },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.xs },
  large: { paddingVertical: spacing.lg },
  compact: { alignItems: 'center', gap: 2, minWidth: 180 },
  compactLabel: { color: colors.parchment, fontFamily: fonts.title, fontSize: 16 },
  compactBig: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 56, fontVariant: ['tabular-nums'], lineHeight: 64 },
  compactTarget: { color: colors.parchment, fontSize: 28 },
  compactBar: { alignSelf: 'stretch' },
});
