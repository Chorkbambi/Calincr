import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clampRepsPerPress, type ExerciseUnit } from '../game';
import { GoldButton } from '../ui/components/GoldButton';
import { colors, fonts, radius, spacing } from '../ui/theme';
import type { ManualRepSource } from './ManualRepSource';

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const UNDO_MESSAGE = 'Made a mistake? Too bad — you’ll have to make up for it!';

/** On-screen controls feeding a ManualRepSource. */
export function ManualRepControls({
  source,
  unit,
  repsPerPress,
  onRepsPerPressChange,
  largeButtons = false,
}: {
  source: ManualRepSource;
  unit: ExerciseUnit;
  repsPerPress: number;
  onRepsPerPressChange: (value: number) => void;
  /** Accessibility: much bigger buttons, easier to hit mid-workout. */
  largeButtons?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [undoShown, setUndoShown] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      source.onTimer((seconds, isRunning) => {
        setElapsed(seconds);
        setRunning(isRunning);
      }),
    [source],
  );

  // Switching exercise stops a running stopwatch.
  useEffect(() => {
    source.stopTimer();
    setElapsed(0);
  }, [source, unit]);

  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);

  // There is deliberately no real undo: a wrong entry must be made up for.
  const undo = () => {
    setUndoShown(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoShown(false), 3000);
  };

  const undoRow = (
    <>
      <GoldButton label="↶ Undo" variant="stone" onPress={undo} style={largeButtons && styles.large} />
      {undoShown ? <Text style={styles.undo}>{UNDO_MESSAGE}</Text> : null}
    </>
  );

  if (unit === 'seconds') {
    return (
      <View style={styles.box}>
        <Text style={styles.timer} accessibilityLabel={`Stopwatch ${elapsed} seconds`}>
          {clock(elapsed)}
        </Text>
        <GoldButton
          big
          label={running ? 'Stop' : 'Start'}
          variant={running ? 'danger' : 'gold'}
          onPress={() => (running ? source.stopTimer() : source.startTimer())}
          style={largeButtons && styles.huge}
        />
        {undoRow}
      </View>
    );
  }

  const step = (delta: number) => onRepsPerPressChange(clampRepsPerPress(repsPerPress + delta));

  return (
    <View style={styles.box}>
      <GoldButton
        big
        label={repsPerPress > 1 ? `Rep ×${repsPerPress}` : 'Rep'}
        onPress={() => source.pressRep(repsPerPress)}
        style={largeButtons && styles.huge}
      />
      <View style={styles.row}>
        <Text style={styles.label}>Reps per press</Text>
        <View style={styles.stepper}>
          <Pressable accessibilityLabel="Fewer reps per press" onPress={() => step(-1)} onLongPress={() => step(-5)} style={styles.stepButton}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.stepValue}>{repsPerPress}</Text>
          <Pressable accessibilityLabel="More reps per press" onPress={() => step(1)} onLongPress={() => step(5)} style={styles.stepButton}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>
      {undoRow}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  large: { paddingVertical: spacing.lg },
  huge: { minHeight: 140 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.goldLight, fontSize: 22, fontFamily: fonts.titleBold },
  stepValue: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 20, minWidth: 36, textAlign: 'center' },
  undo: { color: colors.tired, fontFamily: fonts.title, fontSize: 14, textAlign: 'center' },
  timer: {
    color: colors.goldLight,
    fontFamily: fonts.titleBold,
    fontSize: 48,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
