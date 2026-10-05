import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { adjustSetAmount, getExercise, WORKOUT, type ExerciseId } from '../../game';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';

export interface SetReview {
  exerciseId: ExerciseId;
  /** Counted by the camera, one entry per set. */
  amounts: number[];
}

/**
 * Shown when the camera closes: the counts of each set, which the player can fix up or down
 * (the camera can miss a rep or see one too many). Nothing counts in the game before "Confirm".
 */
export function SetReviewModal({ review, onConfirm }: { review: SetReview | null; onConfirm: (amounts: number[]) => void }) {
  const [amounts, setAmounts] = useState<number[]>(() => review?.amounts ?? []);
  useEffect(() => setAmounts(review?.amounts ?? []), [review]);
  if (!review) return null;
  const seconds = getExercise(review.exerciseId).unit === 'seconds';
  const step = seconds ? WORKOUT.secondsStep : 1;
  const total = amounts.reduce((sum, a) => sum + a, 0);
  const change = (index: number, delta: number) =>
    setAmounts((list) => list.map((a, i) => (i === index ? adjustSetAmount(review.exerciseId, a, delta) : a)));
  const unit = seconds ? ' s' : ' reps';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => onConfirm(amounts)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Check your sets</Text>
            <Text style={styles.exercise}>{getExercise(review.exerciseId).name}</Text>
            <Text style={styles.muted}>
              The camera can miss a rep or count one too many. Fix the numbers if needed, then confirm: your sword
              strikes come with it.
            </Text>
            {amounts.map((amount, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>Set {i + 1}</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${i + 1}: remove`}
                    onPress={() => change(i, -step)}
                    onLongPress={() => change(i, -step * 5)}
                    style={styles.stepButton}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.value}>
                    {amount}
                    {unit}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${i + 1}: add`}
                    onPress={() => change(i, step)}
                    onLongPress={() => change(i, step * 5)}
                    style={styles.stepButton}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={styles.total}>
              Total: {total}
              {unit}
            </Text>
          </ScrollView>
          <GoldButton big label={total > 0 ? '✓ Confirm' : 'Count nothing'} onPress={() => onConfirm(amounts)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldDark,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 1.5,
    gap: spacing.md,
    maxHeight: '90%',
  },
  content: { gap: spacing.md },
  title: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 22 },
  exercise: { color: colors.parchment, fontFamily: fonts.title, fontSize: 16 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontFamily: fonts.title, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.goldLight, fontSize: 24, fontFamily: fonts.titleBold },
  value: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 20, minWidth: 80, textAlign: 'center' },
  total: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 16, textAlign: 'right' },
});
