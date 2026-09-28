import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  bossName,
  EXERCISES,
  getExercise,
  hitDamage,
  MUSCLE_NAMES,
  recommendExercises,
  toDayKey,
  type ExerciseId,
  type WorkInput,
  type WorkOutcome,
} from '../game';
import { useRepInput, type RepEvent } from '../input';
import { useGame } from '../state/GameProvider';
import { BattleArena } from '../ui/components/BattleArena';
import { DailyTip } from '../ui/components/DailyTip';
import { GoldButton } from '../ui/components/GoldButton';
import { Panel } from '../ui/components/Panel';
import { HpBar } from '../ui/components/HpBar';
import { formatAmount, formatNumber } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { useHitQueue } from '../ui/useHitQueue';

const toWorkInput = (event: RepEvent): WorkInput =>
  event.type === 'reps' ? { kind: 'reps', count: event.count } : { kind: 'seconds', seconds: event.seconds };

function describe(outcome: WorkOutcome): string | null {
  const parts: string[] = [];
  for (const boss of outcome.defeatedBosses) parts.push(`${bossName(boss.index)} est vaincu !`);
  for (const up of outcome.levelUps) parts.push(`${MUSCLE_NAMES[up.muscle]} niveau ${up.level} !`);
  return parts.length > 0 ? parts.join('\n') : null;
}

export default function CombatScreen() {
  const { state, openSet, work, closeSet } = useGame();
  const [exerciseId, setExerciseId] = useState<ExerciseId>('pushup');
  const exercise = getExercise(exerciseId);
  const { source, controls } = useRepInput(exercise.unit);
  const { frame, enqueue } = useHitQueue();
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The combat screen only knows the RepSource interface, never its implementation.
  const exerciseRef = useRef(exerciseId);
  exerciseRef.current = exerciseId;
  useEffect(
    () =>
      source.subscribe((event) => {
        const outcome = work(exerciseRef.current, toWorkInput(event));
        enqueue(outcome.hits, event.type === 'reps' && event.burst);
        if (outcome.hits.length > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const text = describe(outcome);
        if (text) {
          setMessage(text);
          if (messageTimer.current) clearTimeout(messageTimer.current);
          messageTimer.current = setTimeout(() => setMessage(null), 2500);
        }
      }),
    [source, work, enqueue],
  );
  useEffect(() => () => void (messageTimer.current && clearTimeout(messageTimer.current)), []);

  const boss = frame.boss ?? state.boss;
  const today = toDayKey(new Date());
  const ranking = useMemo(() => recommendExercises(state, today), [state, today]);
  const selectExercise = (id: ExerciseId) => {
    if (id === exerciseId) return;
    closeSet();
    setExerciseId(id);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.bossHeader}>
            <Text style={styles.bossIndex}>Boss n°{boss.index + 1}</Text>
            <Text style={styles.bossName}>{bossName(boss.index)}</Text>
            <HpBar hp={boss.hp} maxHp={boss.maxHp} bossIndex={boss.index} />
            <Text style={styles.hp}>
              {formatNumber(boss.hp)} / {formatNumber(boss.maxHp)} PV
            </Text>
          </View>

          <BattleArena boss={boss} frame={frame} />

          <View style={styles.damageRow}>
            <Text style={styles.damageLabel}>Dégâts par coup</Text>
            <Text style={styles.damageValue}>{formatNumber(hitDamage(state))}</Text>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <DailyTip ranking={ranking} selected={exerciseId} onSelect={selectExercise} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {EXERCISES.map((e) => {
              const selected = e.id === exerciseId;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => selectExercise(e.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{e.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {controls}

          <Panel title="Série en cours">
            {openSet ? (
              <>
                <Text style={styles.setText}>
                  {getExercise(openSet.exerciseId).name} — {formatAmount(openSet.exerciseId, openSet.amount)} ·{' '}
                  {formatNumber(openSet.damage)} dégâts
                </Text>
                <GoldButton label="Terminer la série" variant="stone" onPress={closeSet} />
              </>
            ) : (
              <Text style={styles.muted}>
                {exercise.unit === 'seconds'
                  ? 'Lance le chronomètre et tiens la planche : un coup d’épée toutes les quelques secondes.'
                  : 'Chaque répétition est un coup d’épée.'}
              </Text>
            )}
          </Panel>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  bossHeader: { gap: spacing.xs },
  bossIndex: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  bossName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 24 },
  hp: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, textAlign: 'right', fontVariant: ['tabular-nums'] },
  damageRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: spacing.sm },
  damageLabel: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 14 },
  damageValue: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 28 },
  message: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 16, textAlign: 'center' },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stone,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.parchment, borderColor: colors.gold },
  chipText: { color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  chipTextSelected: { color: colors.ink },
  setText: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  muted: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
});
