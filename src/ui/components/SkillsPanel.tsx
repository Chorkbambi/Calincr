import { StyleSheet, Text, View } from 'react-native';

import { getExercise, skillProgress, type GameState } from '../../game';
import { formatAmount } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';

/** Long-term calisthenics goals (first pull-up, pistol squat…), each made of record steps. */
export function SkillsPanel({ state }: { state: GameState }) {
  const skills = skillProgress(state.records);
  const mastered = skills.filter((s) => s.complete).length;
  return (
    <Panel title={`Skills · ${mastered}/${skills.length} mastered`}>
      <Text style={styles.muted}>Big goals, one step at a time. Each step is a best set to reach.</Text>
      {skills.map(({ skill, done, complete }) => {
        const next = skill.steps[done];
        return (
          <View key={skill.id} style={[styles.skill, complete && styles.complete]}>
            <View style={styles.row}>
              <Text style={styles.name}>
                {skill.icon} {skill.name}
              </Text>
              <Text style={styles.count}>
                {done}/{skill.steps.length}
              </Text>
            </View>
            <ProgressBar progress={done / skill.steps.length} color={complete ? colors.rested : colors.gold} height={6} />
            <Text style={styles.next}>
              {next
                ? `Next: ${formatAmount(next.exerciseId, next.amount)} of ${getExercise(next.exerciseId).name} in one set` +
                  ` (best: ${formatAmount(next.exerciseId, state.records[next.exerciseId] ?? 0)})`
                : '✓ Mastered!'}
            </Text>
          </View>
        );
      })}
    </Panel>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13 },
  skill: { gap: 4, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.stoneLight },
  complete: { borderColor: colors.rested },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 15 },
  count: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 14 },
  next: { color: colors.textMuted, fontSize: 13 },
});
