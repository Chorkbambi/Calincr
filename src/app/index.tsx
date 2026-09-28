import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COSMETICS,
  ENEMIES,
  enemyName,
  enemyWeakness,
  exerciseStyle,
  STYLE_NAMES,
  WEAKNESS,
  exercisesForDifficulty,
  getExercise,
  hitDamage,
  isBossStage,
  isExerciseId,
  MUSCLE_NAMES,
  sortByFavorites,
  toDayKey,
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
import { ComboBadge } from '../ui/components/ComboBadge';
import { RestTimer } from '../ui/components/RestTimer';
import { WeeklyBossBar } from '../ui/components/WeeklyBossBar';
import { formatAmount, formatCompact, formatDayShort, formatNumber } from '../ui/format';
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
  if (outcome.record) {
    parts.push(
      `🏅 New record: ${formatAmount(outcome.record.exerciseId, outcome.record.amount)} in one set (was ${formatNumber(outcome.record.previous)}) · +${formatNumber(outcome.record.gold)} gold`,
    );
  }
  if (outcome.weeklyBossGold !== null) parts.push(`👑 Weekly Titan defeated! +${formatNumber(outcome.weeklyBossGold)} gold`);
  for (const up of outcome.levelUps) parts.push(`${MUSCLE_NAMES[up.muscle]} reached level ${up.level}!`);
  for (const a of outcome.achievements) parts.push(`🏆 Achievement: ${a.name} · +${formatNumber(a.gold)} gold`);
  return parts.length > 0 ? parts.slice(-4).join('\n') : null;
}

export default function CombatScreen() {
  const {
    state,
    quest,
    settings,
    openSet,
    work,
    refreshQuest,
    closeSet,
    updateSettings,
    calibrations,
    setCalibration,
    repository,
    dataVersion,
  } = useGame();
  const params = useLocalSearchParams<{ exercise?: string }>();
  const focused = useIsFocused();
  const exercises = useMemo(
    () => sortByFavorites(exercisesForDifficulty(settings.difficulty), settings.favorites),
    [settings.difficulty, settings.favorites],
  );
  const [lastDone, setLastDone] = useState<Record<string, { day: string; amount: number }>>({});
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [exerciseId, setExerciseId] = useState<ExerciseId>(() => (exercises[0]?.id as ExerciseId) ?? 'pushup');
  const [guideFor, setGuideFor] = useState<ExerciseId | null>(null);
  const exercise = getExercise(exerciseId);
  const { frame, enqueue } = useHitQueue();
  const [message, setMessage] = useState<string | null>(null);

  /** Ends the current set and, if the player wants it, starts the rest timer. */
  const finishSet = () => {
    closeSet();
    if (settings.restTimerSeconds > 0) setRestStartedAt(Date.now());
  };
  const restTimer =
    restStartedAt !== null ? (
      <RestTimer startedAt={restStartedAt} seconds={settings.restTimerSeconds} onDone={() => setRestStartedAt(null)} />
    ) : null;
  const hudEnemy = frame.enemy ?? state.enemy;
  const style = exerciseStyle(exercise);
  const weakness = (level: number, stage: number) => {
    const weak = enemyWeakness(level, stage);
    const hits = weak === style;
    return (
      <Text style={[styles.weakness, hits && styles.weaknessHit]}>
        Weak to {STYLE_NAMES[weak]}
        {hits ? ` · your exercise hits it: +${Math.round(WEAKNESS.damageBonus * 100)}% damage!` : ''}
      </Text>
    );
  };
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
      {weakness(hudEnemy.level, hudEnemy.stage)}
      <ComboBadge count={state.combo.count} lastHitAt={state.combo.lastHitAt} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {restTimer}
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
    onSetDone: finishSet,
    calibrations,
    onCalibrated: setCalibration,
    largeButtons: settings.largeButtons,
  });

  useEffect(() => {
    let cancelled = false;
    repository.lastDoneByExercise().then((map) => {
      if (!cancelled) setLastDone(map);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, dataVersion]);
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

  const isFavorite = settings.favorites.includes(exerciseId);
  const toggleFavorite = () =>
    updateSettings({
      favorites: isFavorite ? settings.favorites.filter((f) => f !== exerciseId) : [...settings.favorites, exerciseId],
    });
  const last = lastDone[exerciseId];
  const today = toDayKey(new Date());
  const lastDoneText = last
    ? `Last time: ${formatAmount(exerciseId, last.amount)} · ${last.day === today ? 'today' : formatDayShort(last.day)}`
    : 'Never done yet — take it easy the first time.';

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
            {weakness(enemy.level, enemy.stage)}
          </View>

          <BattleArena
            enemy={enemy}
            frame={frame}
            weaponTier={Math.max(0, weaponTier)}
            glow={COSMETICS.find((c) => c.id === state.equippedCosmetics.glow)?.color}
            numberColor={COSMETICS.find((c) => c.id === state.equippedCosmetics.numbers)?.color}
          />

          <View style={styles.damageRow}>
            <Text style={styles.damageLabel}>Damage per hit</Text>
            <Text style={styles.damageValue}>{formatNumber(hitDamage(state))}</Text>
          </View>
          <ComboBadge count={state.combo.count} lastHitAt={state.combo.lastHitAt} />
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <DailyQuestCard quest={quest} state={state} selected={exerciseId} onSelect={selectExercise} onHowTo={setGuideFor} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {exercises.map((e) => {
              const selected = e.id === exerciseId;
              const pinned = settings.favorites.includes(e.id as ExerciseId);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => selectExercise(e.id as ExerciseId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected, settings.largeButtons && styles.chipLarge]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected, settings.largeButtons && styles.chipTextLarge]}>
                    {pinned ? '★ ' : ''}
                    {exerciseStyle(e) === enemyWeakness(enemy.level, enemy.stage) ? '⚡ ' : ''}
                    {e.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Pressable onPress={toggleFavorite} hitSlop={8} accessibilityRole="button" accessibilityLabel={isFavorite ? 'Unpin exercise' : 'Pin exercise'}>
              <Text style={styles.howTo}>{isFavorite ? '★ Pinned' : '☆ Pin'}</Text>
            </Pressable>
            <Pressable onPress={() => setGuideFor(exerciseId)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.howTo}>ⓘ How to</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>
            {lastDoneText}
            {state.records[exerciseId] ? ` · Record: ${formatAmount(exerciseId, state.records[exerciseId]!)} in one set` : ''}
          </Text>

          {restTimer}
          {controls}

          <Panel title="Current set">
            {openSet ? (
              <>
                <Text style={styles.setText}>
                  {getExercise(openSet.exerciseId).name} — {formatAmount(openSet.exerciseId, openSet.amount)} ·{' '}
                  {formatNumber(openSet.damage)} damage
                </Text>
                <GoldButton
                  label="Finish set"
                  variant="stone"
                  onPress={finishSet}
                  style={settings.largeButtons ? styles.largeButton : undefined}
                />
              </>
            ) : (
              <Text style={styles.muted}>
                {exercise.unit === 'seconds'
                  ? 'Hold the position: one sword strike every few seconds.'
                  : 'Every rep is a sword strike.'}
              </Text>
            )}
          </Panel>

          <WeeklyBossBar state={state} today={today} />
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
  weakness: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  weaknessHit: { color: colors.rested, fontWeight: '700' },
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
  chipLarge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chipTextLarge: { fontSize: 17 },
  largeButton: { paddingVertical: spacing.lg },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  exerciseName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 18, flexShrink: 1, flex: 1 },
  howTo: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 14 },
  setText: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
});
