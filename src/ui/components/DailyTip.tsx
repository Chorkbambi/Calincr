import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getExercise, MUSCLE_NAMES, type ExerciseId, type ExerciseRecommendation } from '../../game';
import { formatMultiplier } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { Panel } from './Panel';

function bonusLabel(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  if (pct === 0) return 'normal XP';
  return pct > 0 ? `+${pct}% XP` : `${pct}% XP`;
}

/** Best exercise of the day according to each muscle's rest bonus. */
export function DailyTip({
  ranking,
  selected,
  onSelect,
}: {
  ranking: ExerciseRecommendation[];
  selected: ExerciseId;
  onSelect: (id: ExerciseId) => void;
}) {
  const [best, ...others] = ranking;
  if (!best) return null;
  const alternatives = others.filter((r) => r.effectiveMultiplier >= 1).slice(0, 2);
  return (
    <Panel title="Today’s best pick">
      {best.effectiveMultiplier < 1 ? (
        <Text style={styles.muted}>All your muscles are tired: a rest day will pay off more tomorrow.</Text>
      ) : null}
      <Pressable
        onPress={() => onSelect(best.exerciseId)}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${getExercise(best.exerciseId).name}`}
        style={[styles.best, best.exerciseId === selected && styles.bestSelected]}
      >
        <View style={styles.row}>
          <Text style={styles.name}>{getExercise(best.exerciseId).name}</Text>
          <Text style={[styles.bonus, best.effectiveMultiplier < 1 && styles.malus]}>
            {bonusLabel(best.effectiveMultiplier)}
          </Text>
        </View>
        <Text style={styles.muted}>
          {best.muscles.map((m) => `${MUSCLE_NAMES[m.muscle]} ${formatMultiplier(m.multiplier)}`).join(' · ')}
        </Text>
      </Pressable>
      {alternatives.length > 0 ? (
        <View style={styles.row}>
          <Text style={styles.muted}>Also:</Text>
          {alternatives.map((r) => (
            <Pressable key={r.exerciseId} onPress={() => onSelect(r.exerciseId)} hitSlop={6}>
              <Text style={styles.alt}>
                {getExercise(r.exerciseId).name} ({bonusLabel(r.effectiveMultiplier)})
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  best: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
    padding: spacing.md,
    gap: 4,
  },
  bestSelected: { borderColor: colors.gold },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  name: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 17 },
  bonus: { color: colors.rested, fontFamily: fonts.titleBold, fontSize: 14 },
  malus: { color: colors.tired },
  muted: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  alt: { color: colors.goldLight, fontFamily: fonts.body, fontSize: 13, textDecorationLine: 'underline' },
});
