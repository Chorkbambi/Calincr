import { Pressable, StyleSheet, Text, View } from 'react-native';

import { evaluateExercise, getExercise, MUSCLE_NAMES, type DailyQuest, type ExerciseId, type GameState } from '../../game';
import { formatAmount, formatDayShort, formatMultiplier, formatNumber } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';

function bonusLabel(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  if (pct === 0) return 'normal XP';
  return pct > 0 ? `+${pct}% XP` : `${pct}% XP`;
}

/**
 * The one exercise suggested today, with a target built on the player's last session.
 * Just a nudge: players are free to train anything else.
 */
export function DailyQuestCard({
  quest,
  state,
  selected,
  onSelect,
  onHowTo,
}: {
  quest: DailyQuest | null;
  state: GameState;
  selected: ExerciseId;
  onSelect: (id: ExerciseId) => void;
  onHowTo: (id: ExerciseId) => void;
}) {
  if (!quest) {
    return (
      <Panel title="Daily quest">
        <Text style={styles.muted}>Preparing today’s quest…</Text>
      </Panel>
    );
  }
  const exercise = getExercise(quest.exerciseId);
  const seconds = exercise.unit === 'seconds';
  const unit = seconds ? 's' : ' reps';
  const muscles = evaluateExercise(state, exercise, quest.day).muscles;

  // Done for today: one line is enough, the rest of the screen stays for the fight.
  if (quest.completed) {
    return (
      <View style={styles.doneBox} accessibilityRole="summary">
        <Text style={styles.done}>✓ Daily quest complete: {exercise.name}</Text>
        <Text style={styles.muted}>A new quest waits for you tomorrow.</Text>
      </View>
    );
  }

  return (
    <Panel title="Daily quest">
      {quest.comeback ? (
        <Text style={styles.streak}>👋 Welcome back, hero! An easier quest today, with bonus gold.</Text>
      ) : null}
      {quest.goal && quest.goal !== 'normal' ? (
        <Text style={styles.muted}>{quest.goal === 'short' ? '⚡ Short session today' : '🔥 Big session today'}</Text>
      ) : null}
      <Pressable
        onPress={() => onSelect(quest.exerciseId)}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${exercise.name}`}
        style={[styles.card, quest.exerciseId === selected && styles.cardSelected]}
      >
        <View style={styles.row}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Pressable onPress={() => onHowTo(quest.exerciseId)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.howTo}>ⓘ How to</Text>
          </Pressable>
        </View>
        <Text style={styles.target}>
          {quest.sets > 1 ? `${quest.sets} sets × ${quest.perSet}${unit}` : `${quest.target}${unit}`}
          {quest.sets > 1 ? <Text style={styles.muted}>{`  (${quest.target}${unit} in total)`}</Text> : null}
        </Text>
        <Text style={styles.muted}>
          {quest.lastDone
            ? `Last time: ${formatAmount(quest.exerciseId, quest.lastDone.amount)} on ${formatDayShort(quest.lastDone.day)} — ${
                quest.target > quest.lastDone.amount ? 'a little more today.' : 'take it easier today.'
              }`
            : 'First time: take it easy and focus on good form.'}
        </Text>
        <Text style={[styles.bonus, quest.effectiveMultiplier < 1 && styles.malus]}>
          {bonusLabel(quest.effectiveMultiplier)} ·{' '}
          <Text style={styles.muted}>
            {muscles.map((m) => `${MUSCLE_NAMES[m.muscle]} ${formatMultiplier(m.multiplier)}`).join(' · ')}
          </Text>
        </Text>
        <ProgressBar progress={quest.progress / quest.target} color={quest.completed ? colors.rested : colors.gold} />
        <View style={styles.row}>
          <Text style={styles.muted}>
            {Math.min(quest.progress, quest.target)} / {quest.target}
            {unit}
          </Text>
          <Text style={styles.reward}>
            Reward: +{formatNumber(quest.rewardXp)} XP · +{formatNumber(quest.rewardGold)} gold
          </Text>
        </View>
      </Pressable>
      {quest.completed ? (
        <Text style={styles.done}>✓ Quest complete! A new one waits for you tomorrow.</Text>
      ) : (
        <Text style={styles.muted}>One quest a day. Want more? Train anything you like — it all counts.</Text>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
    padding: spacing.md,
    gap: 6,
  },
  cardSelected: { borderColor: colors.gold },
  doneBox: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rested,
    backgroundColor: colors.stone,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  name: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 17, flexShrink: 1 },
  howTo: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 13 },
  target: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 20 },
  bonus: { color: colors.rested, fontFamily: fonts.title, fontSize: 13 },
  malus: { color: colors.tired },
  reward: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  streak: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 14 },
  freeze: { color: '#9fe6ff', fontSize: 13 },
  done: { color: colors.rested, fontFamily: fonts.titleBold, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13, fontFamily: undefined },
});
