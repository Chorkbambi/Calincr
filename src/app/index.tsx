import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ENEMIES,
  enemyName,
  exercisesForDifficulty,
  getExercise,
  hitDamage,
  isBossStage,
  isExerciseId,
  MUSCLE_NAMES,
  WEAPONS,
  zoneForLevel,
  type ExerciseId,
  type WorkInput,
} from '../game';
import { useRepInput, type RepEvent } from '../input';
import { useGame, type WorkResult } from '../state/GameProvider';
import { BattleArena } from '../ui/components/BattleArena';
import { DailyQuestCard } from '../ui/components/DailyQuestCard';
import { ExerciseGuideModal } from '../ui/components/ExerciseGuideModal';
import { GoldButton } from '../ui/components/GoldButton';
import { HpBar } from '../ui/components/HpBar';
import { Panel } from '../ui/components/Panel';
import { formatAmount, formatCompact, formatNumber } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { useHitQueue } from '../ui/useHitQueue';

const toWorkInput = (event: RepEvent): WorkInput =>
  event.type === 'reps' ? { kind: 'reps', count: event.count } : { kind: 'seconds', seconds: event.seconds };

function describe(outcome: WorkResult): string | null {
  const parts: string[] = [];
  for (const kill of outcome.kills) {
    parts.push(
      kill.boss
        ? `Boss ${enemyName(kill.level, kill.stage)} defeated! Level ${kill.level + 1} unlocked · +${formatNumber(kill.gold)} gold`
        : `${enemyName(kill.level, kill.stage)} defeated · +${formatNumber(kill.gold)} gold`,
    );
  }
  if (outcome.questCompleted) {
    parts.push(
      `Daily quest complete! +${formatNumber(outcome.questCompleted.rewardXp)} XP · +${formatNumber(outcome.questCompleted.rewardGold)} gold`,
    );
  }
  for (const up of outcome.levelUps) parts.push(`${MUSCLE_NAMES[up.muscle]} reached level ${up.level}!`);
  return parts.length > 0 ? parts.slice(-3).join('\n') : null;
}

export default function CombatScreen() {
  const { state, quest, settings, openSet, work, refreshQuest, closeSet, updateSettings } = useGame();
  const params = useLocalSearchParams<{ exercise?: string }>();
  const focused = useIsFocused();
  const exercises = useMemo(() => exercisesForDifficulty(settings.difficulty), [settings.difficulty]);
  const [exerciseId, setExerciseId] = useState<ExerciseId>(() => (exercises[0]?.id as ExerciseId) ?? 'pushup');
  const [guideFor, setGuideFor] = useState<ExerciseId | null>(null);
  const exercise = getExercise(exerciseId);
  const { frame, enqueue } = useHitQueue();
  const [message, setMessage] = useState<string | null>(null);
  const hudEnemy = frame.enemy ?? state.enemy;
  const hud = (
    <View style={styles.hud}>
      <View style={styles.topRow}>
        <Text style={styles.hudName} numberOfLines={1}>
          Lv. {hudEnemy.level} · {enemyName(hudEnemy.level, hudEnemy.stage)}
          {isBossStage(hudEnemy.stage) ? ' (Boss)' : ''}
        </Text>
        <Text style={styles.gold}>🪙 {formatCompact(state.gold)}</Text>
      </View>
      <HpBar hp={hudEnemy.hp} maxHp={hudEnemy.maxHp} enemyKey={hudEnemy.level * 1000 + hudEnemy.stage} />
      <Text style={styles.hp}>
        {formatNumber(hudEnemy.hp)} / {formatNumber(hudEnemy.maxHp)} HP · {formatNumber(hitDamage(state))} per hit
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
  const { source, controls } = useRepInput({
    mode: settings.inputMode,
    exerciseId,
    active: focused,
    repsPerPress: settings.repsPerPress,
    onRepsPerPressChange: (repsPerPress) => updateSettings({ repsPerPress }),
    hud,
    hideCameraImage: settings.hideCameraImage,
    onHideCameraImageChange: (hideCameraImage) => updateSettings({ hideCameraImage }),
  });
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectExercise = (id: ExerciseId) => {
    if (id === exerciseId) return;
    closeSet();
    setExerciseId(id);
  };

  // New day while the app stayed open: get today's quest.
  useEffect(() => {
    if (focused) refreshQuest();
  }, [focused, refreshQuest]);

  // Exercise picked from another screen (muscle sheet).
  useEffect(() => {
    if (!params.exercise) return;
    if (isExerciseId(params.exercise)) selectExercise(params.exercise);
    router.setParams({ exercise: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.exercise]);

  // Difficulty changed in Settings: keep the exercise only if it is still offered.
  useEffect(() => {
    if (!exercises.some((e) => e.id === exerciseId)) selectExercise(exercises[0]?.id as ExerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

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
          messageTimer.current = setTimeout(() => setMessage(null), 3000);
        }
      }),
    [source, work, enqueue],
  );
  useEffect(() => () => void (messageTimer.current && clearTimeout(messageTimer.current)), []);

  const enemy = frame.enemy ?? state.enemy;
  const boss = isBossStage(enemy.stage);
  const zone = zoneForLevel(enemy.level);
  const weaponTier = WEAPONS.findIndex((w) => w.id === state.weaponId);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <Text style={styles.zone}>{zone.title}</Text>
            <Text style={styles.gold}>🪙 {formatCompact(state.gold)}</Text>
          </View>
          <View style={styles.enemyHeader}>
            <Text style={styles.stage}>
              Level {enemy.level} · {boss ? 'BOSS' : `Monster ${enemy.stage + 1}/${ENEMIES.monstersPerLevel}`}
            </Text>
            <Text style={[styles.enemyName, boss && styles.bossName]}>{enemyName(enemy.level, enemy.stage)}</Text>
            <HpBar hp={enemy.hp} maxHp={enemy.maxHp} enemyKey={enemy.level * 1000 + enemy.stage} />
            <Text style={styles.hp}>
              {formatNumber(enemy.hp)} / {formatNumber(enemy.maxHp)} HP
            </Text>
          </View>

          <BattleArena enemy={enemy} frame={frame} weaponTier={Math.max(0, weaponTier)} />

          <View style={styles.damageRow}>
            <Text style={styles.damageLabel}>Damage per hit</Text>
            <Text style={styles.damageValue}>{formatNumber(hitDamage(state))}</Text>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <DailyQuestCard quest={quest} state={state} selected={exerciseId} onSelect={selectExercise} onHowTo={setGuideFor} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {exercises.map((e) => {
              const selected = e.id === exerciseId;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => selectExercise(e.id as ExerciseId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{e.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Pressable onPress={() => setGuideFor(exerciseId)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.howTo}>ⓘ How to</Text>
            </Pressable>
          </View>

          {controls}

          <Panel title="Current set">
            {openSet ? (
              <>
                <Text style={styles.setText}>
                  {getExercise(openSet.exerciseId).name} — {formatAmount(openSet.exerciseId, openSet.amount)} ·{' '}
                  {formatNumber(openSet.damage)} damage
                </Text>
                <GoldButton label="Finish set" variant="stone" onPress={closeSet} />
              </>
            ) : (
              <Text style={styles.muted}>
                {exercise.unit === 'seconds'
                  ? 'Hold the position: one sword strike every few seconds.'
                  : 'Every rep is a sword strike.'}
              </Text>
            )}
          </Panel>
        </ScrollView>
      </KeyboardAvoidingView>
      <ExerciseGuideModal exerciseId={guideFor} onClose={() => setGuideFor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hud: { backgroundColor: 'rgba(27,21,16,0.72)', borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  hudName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 15, flexShrink: 1 },
  zone: { color: colors.gold, fontFamily: fonts.title, fontSize: 14, letterSpacing: 1 },
  gold: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 16 },
  enemyHeader: { gap: spacing.xs },
  stage: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  enemyName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 24 },
  bossName: { color: colors.goldLight },
  hp: { color: colors.textMuted, fontSize: 13, textAlign: 'right', fontVariant: ['tabular-nums'] },
  damageRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: spacing.sm },
  damageLabel: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 14 },
  damageValue: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 28 },
  message: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 15, textAlign: 'center' },
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
  chipText: { color: colors.text, fontSize: 14 },
  chipTextSelected: { color: colors.ink },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 18, flexShrink: 1 },
  howTo: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 14 },
  setText: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
});
