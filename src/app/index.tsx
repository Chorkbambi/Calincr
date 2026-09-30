import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
  getExercise,
  hitDamage,
  isBossStage,
  isExerciseId,
  MUSCLE_NAMES,
  recommendExercises,
  sortForBattle,
  STYLE_MUSCLES,
  toDayKey,
  todayFocus,
  voiceCountPhrase,
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
import { LevelUpBanner, type LevelUpEvent } from '../ui/components/LevelUpBanner';
import { ComboBadge } from '../ui/components/ComboBadge';
import { RestTimer } from '../ui/components/RestTimer';
import { VoiceToggle } from '../ui/components/VoiceToggle';
import { WeeklyBossBar } from '../ui/components/WeeklyBossBar';
import { formatAmount, formatCompact, formatDayShort, formatNumber } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { useHitQueue } from '../ui/useHitQueue';
import { say, stopSpeaking } from '../ui/voice';

const KEEP_AWAKE_TAG = 'fight';
const LEVEL_UP_BANNER_MS = 2500;

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
  const { frame, enqueue } = useHitQueue();
  const [lastDone, setLastDone] = useState<Record<string, { day: string; amount: number }>>({});
  const today = toDayKey(new Date());
  // One muscle group per day: the group already trained today stays suggested, otherwise the least recently trained.
  const focus = useMemo(() => todayFocus(lastDone, today), [lastDone, today]);
  const ranking = useMemo(
    () => recommendExercises(state, today, settings.difficulty, focus),
    [state, today, settings.difficulty, focus],
  );
  const suggestedStyle = ranking[0]?.style ?? null;
  const shownEnemy = frame.enemy ?? state.enemy;
  const currentWeakness = enemyWeakness(shownEnemy.level, shownEnemy.stage);
  // Favourites, then the exercises dealing the most damage to this enemy (its weakness), then the suggestions.
  const exercises = useMemo(
    () => sortForBattle(ranking, currentWeakness, settings.favorites).map(getExercise),
    [ranking, currentWeakness, settings.favorites],
  );
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [exerciseId, setExerciseId] = useState<ExerciseId>(() => (exercises[0]?.id as ExerciseId) ?? 'pushup');
  const [guideFor, setGuideFor] = useState<ExerciseId | null>(null);
  const exercise = getExercise(exerciseId);
  const [message, setMessage] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const setVoiceCount = (voiceCount: boolean) => {
    if (!voiceCount) stopSpeaking();
    updateSettings({ voiceCount });
  };

  // The screen stays on during the fight (phone on the floor, rest timer), never on other tabs.
  useEffect(() => {
    if (!focused) return undefined;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [focused]);

  /** Ends the current set and, if the player wants it, starts the rest timer. */
  const finishSet = () => {
    closeSet();
    if (settings.restTimerSeconds > 0) setRestStartedAt(Date.now());
  };
  const restTimer =
    restStartedAt !== null ? (
      <RestTimer
        startedAt={restStartedAt}
        seconds={settings.restTimerSeconds}
        onDone={() => setRestStartedAt(null)}
        voice={settings.voiceCount}
      />
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
      <VoiceToggle value={settings.voiceCount} onChange={setVoiceCount} />
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
  const voiceRef = useRef(settings.voiceCount);
  voiceRef.current = settings.voiceCount;
  const levelUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () =>
      source.subscribe((event) => {
        const outcome = work(exerciseRef.current, toWorkInput(event));
        enqueue(outcome.hits, event.type === 'reps' && event.burst);
        if (outcome.hits.length > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (voiceRef.current) {
          const phrase = voiceCountPhrase(getExercise(exerciseRef.current).unit, outcome.setAmount - outcome.amount, outcome.setAmount);
          if (phrase) say(phrase);
        }
        if (outcome.levelUps.length > 0) {
          setLevelUp((prev) => ({ key: (prev?.key ?? 0) + 1, levelUps: outcome.levelUps }));
          if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
          levelUpTimer.current = setTimeout(() => setLevelUp(null), LEVEL_UP_BANNER_MS);
        }
        const text = describe(outcome);
        if (text) {
          setMessage(text);
          if (messageTimer.current) clearTimeout(messageTimer.current);
          messageTimer.current = setTimeout(() => setMessage(null), 3000);
        }
      }),
    [source, work, enqueue],
  );
  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
      stopSpeaking();
    },
    [],
  );

  const isFavorite = settings.favorites.includes(exerciseId);
  const toggleFavorite = () =>
    updateSettings({
      favorites: isFavorite ? settings.favorites.filter((f) => f !== exerciseId) : [...settings.favorites, exerciseId],
    });
  const last = lastDone[exerciseId];
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
            <View style={styles.hpRow}>
              <Text style={styles.damageValue}>⚔ {formatNumber(hitDamage(state))} per hit</Text>
              <Text style={styles.hp}>
                {formatNumber(enemy.hp)} / {formatNumber(enemy.maxHp)} HP
              </Text>
            </View>
            {weakness(enemy.level, enemy.stage)}
          </View>

          <View>
            <BattleArena
              enemy={enemy}
              frame={frame}
              weaponTier={Math.max(0, weaponTier)}
              glow={COSMETICS.find((c) => c.id === state.equippedCosmetics.glow)?.color}
              numberColor={COSMETICS.find((c) => c.id === state.equippedCosmetics.numbers)?.color}
            />
            <LevelUpBanner event={levelUp} damage={hitDamage(state)} />
          </View>

          <ComboBadge count={state.combo.count} lastHitAt={state.combo.lastHitAt} />
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {suggestedStyle ? (
            <Text style={styles.suggestion}>
              💡 {focus === suggestedStyle ? 'Keep going with your' : 'Suggested today:'} {STYLE_NAMES[suggestedStyle]} day
              <Text style={styles.muted}>
                {' '}
                ({(STYLE_MUSCLES[suggestedStyle] as readonly (keyof typeof MUSCLE_NAMES)[]).map((m) => MUSCLE_NAMES[m]).join(', ')}
                {focus === suggestedStyle ? '' : ' — least trained lately'})
              </Text>
            </Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {exercises.map((e) => {
              const selected = e.id === exerciseId;
              const pinned = settings.favorites.includes(e.id as ExerciseId);
              const suggested = exerciseStyle(e) === suggestedStyle;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => selectExercise(e.id as ExerciseId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    suggested && styles.chipSuggested,
                    selected && styles.chipSelected,
                    settings.largeButtons && styles.chipLarge,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected, settings.largeButtons && styles.chipTextLarge]}>
                    {pinned ? '★ ' : ''}
                    {exerciseStyle(e) === currentWeakness ? '⚡ ' : ''}
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

          {openSet ? (
            <View style={styles.setBox}>
              <Text style={styles.setText}>
                Current set: <Text style={styles.setAmount}>{formatAmount(openSet.exerciseId, openSet.amount)}</Text> ·{' '}
                {formatNumber(openSet.damage)} damage
              </Text>
              <GoldButton
                label="Finish set"
                variant="stone"
                onPress={finishSet}
                style={settings.largeButtons ? styles.largeButton : undefined}
              />
            </View>
          ) : (
            <Text style={[styles.muted, styles.center]}>
              {exercise.unit === 'seconds'
                ? 'Hold the position: one sword strike every few seconds.'
                : 'Every rep is a sword strike.'}
            </Text>
          )}
          <VoiceToggle value={settings.voiceCount} onChange={setVoiceCount} />

          <DailyQuestCard quest={quest} state={state} selected={exerciseId} onSelect={selectExercise} onHowTo={setGuideFor} />
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
  hpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  damageValue: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 16 },
  setBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stone,
  },
  setAmount: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 18 },
  center: { textAlign: 'center' },
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
  chipSuggested: { borderColor: colors.rested },
  suggestion: { color: colors.text, fontSize: 14 },
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
