import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SESSION_GOAL, type DailyQuest, type SessionGoal } from '../../game';
import { colors, fonts, radius, spacing } from '../theme';

const CHOICES: { goal: SessionGoal; label: string; hint: string }[] = [
  { goal: 'short', label: '⚡ Short', hint: `${Math.round(SESSION_GOAL.short * 100)}% quest` },
  { goal: 'normal', label: 'Normal', hint: 'full quest' },
  { goal: 'big', label: '🔥 Big', hint: `+${Math.round((SESSION_GOAL.big - 1) * 100)}% quest` },
];

/** Asked once a day before the quest starts: how long is today's session? Scales the quest target. */
export function SessionGoalCard({
  quest,
  onPick,
  onNeverAsk,
}: {
  quest: DailyQuest;
  onPick: (goal: SessionGoal | null) => void;
  onNeverAsk: () => void;
}) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>How much time today?</Text>
      <Text style={styles.muted}>Sets today’s quest ({quest.baseTarget} is the normal target).</Text>
      <View style={styles.row}>
        {CHOICES.map((c) => (
          <Pressable key={c.goal} onPress={() => onPick(c.goal)} accessibilityRole="button" style={styles.choice}>
            <Text style={styles.label}>{c.label}</Text>
            <Text style={styles.hint}>{c.hint}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.footer}>
        <Pressable onPress={() => onPick(null)} accessibilityRole="button" hitSlop={8} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable onPress={onNeverAsk} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.never}>Don’t ask again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.stone },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 17 },
  muted: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
  },
  label: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  skipText: { color: colors.text, fontFamily: fonts.title, fontSize: 14 },
  never: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
