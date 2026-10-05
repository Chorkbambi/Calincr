import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DIFFICULTY_NAMES, EXERCISE_GUIDES, getExercise, MUSCLE_NAMES, muscleWeights, type ExerciseId } from '../../game';
import { describeBodyParts, requiredBodyParts } from '../../pose/visibility';
import { colors, fonts, radius, spacing } from '../theme';
import { ExerciseAnimationView } from './ExerciseAnimationView';
import { GoldButton } from './GoldButton';

/** "How to do it" sheet for an exercise. */
export function ExerciseGuideModal({ exerciseId, onClose }: { exerciseId: ExerciseId | null; onClose: () => void }) {
  const exercise = exerciseId ? getExercise(exerciseId) : null;
  const guide = exerciseId ? EXERCISE_GUIDES[exerciseId] : null;
  return (
    <Modal visible={exercise !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      {exercise && guide ? (
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{exercise.name}</Text>
            <Text style={styles.meta}>
              {DIFFICULTY_NAMES[exercise.tier]} ·{' '}
              {muscleWeights(exercise)
                .map(([m, w]) => `${MUSCLE_NAMES[m]} ${Math.round(w * 100)}%`)
                .join(' · ')}
            </Text>
            <ExerciseAnimationView exerciseId={exerciseId!} />
            {guide.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.text}>{step}</Text>
              </View>
            ))}
            <Text style={styles.heading}>Tip</Text>
            <Text style={styles.text}>{guide.tip}</Text>
            <Text style={styles.heading}>Camera</Text>
            <Text style={styles.text}>{guide.camera}</Text>
            <Text style={styles.text}>
              The camera must see your {describeBodyParts(requiredBodyParts(exerciseId!))}.
            </Text>
            <Text style={styles.warning}>Stop if you feel pain. Warm up before training.</Text>
          </ScrollView>
          <GoldButton label="Got it" onPress={onClose} style={styles.close} />
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.stone,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderColor: colors.goldDark,
    borderWidth: 1,
    paddingBottom: spacing.xl,
  },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 22 },
  meta: { color: colors.gold, fontSize: 13, marginBottom: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNumber: {
    color: colors.ink,
    backgroundColor: colors.gold,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.titleBold,
    fontSize: 12,
    overflow: 'hidden',
  },
  text: { color: colors.text, fontSize: 15, lineHeight: 21, flex: 1 },
  heading: { color: colors.gold, fontFamily: fonts.titleBold, fontSize: 14, marginTop: spacing.sm },
  warning: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: spacing.md },
  close: { marginHorizontal: spacing.lg },
});
