import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clampPlan, getExercise, REST_TIMER_CHOICES, WORKOUT, type ExerciseId, type WorkoutPlan } from '../../game';
import { restTimerLabel } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { Panel } from './Panel';
import { VoiceToggle } from './VoiceToggle';

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: string;
  step: number;
  onChange: (delta: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: less`}
          onPress={() => onChange(-step)}
          onLongPress={() => onChange(-step * 5)}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: more`}
          onPress={() => onChange(step)}
          onLongPress={() => onChange(step * 5)}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Picked before an exercise: number of sets, reps (or seconds) per set and the rest between sets.
 * Each set then ends by itself and the rest timer starts on its own.
 */
export function PlanCard({
  exerciseId,
  plan,
  onChange,
  onRestChange,
  voice,
  onVoiceChange,
  note,
}: {
  exerciseId: ExerciseId;
  plan: WorkoutPlan;
  onChange: (plan: WorkoutPlan) => void;
  onRestChange: (seconds: number) => void;
  voice: boolean;
  onVoiceChange: (value: boolean) => void;
  /** Where the plan comes from ("From today's quest"…). */
  note: string;
}) {
  const seconds = getExercise(exerciseId).unit === 'seconds';
  const change = (patch: Partial<WorkoutPlan>) => onChange(clampPlan(exerciseId, { ...plan, ...patch }));
  return (
    <Panel title="Your plan">
      <Stepper label="Sets" value={String(plan.sets)} step={1} onChange={(d) => change({ sets: plan.sets + d })} />
      <Stepper
        label={seconds ? 'Seconds per set' : 'Reps per set'}
        value={seconds ? `${plan.perSet} s` : String(plan.perSet)}
        step={seconds ? WORKOUT.secondsStep : 1}
        onChange={(d) => change({ perSet: plan.perSet + d })}
      />
      <Text style={styles.label}>Rest between sets</Text>
      <View style={styles.chips}>
        {REST_TIMER_CHOICES.map((s) => {
          const selected = plan.restSeconds === s;
          return (
            <Pressable
              key={s}
              onPress={() => onRestChange(s)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{restTimerLabel(s)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.muted}>
        {note} · {plan.sets * plan.perSet}
        {seconds ? ' s' : ' reps'} in total. Each set ends by itself at its target, then the rest timer starts.
      </Text>
      <VoiceToggle value={voice} onChange={onVoiceChange} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontFamily: fonts.title, fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.goldLight, fontSize: 22, fontFamily: fonts.titleBold },
  stepValue: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 20, minWidth: 56, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.stoneLight,
  },
  chipSelected: { borderColor: colors.gold },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextSelected: { color: colors.goldLight },
  muted: { color: colors.textMuted, fontSize: 12 },
});
