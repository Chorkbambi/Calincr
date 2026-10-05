import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COSMETICS,
  DIFFICULTY_NAMES,
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
  nextVariation,
  recommendExercises,
  sortForBattle,
  STYLE_MUSCLES,
  suggestPlan,
  toDayKey,
  todayFocus,
  WEAPONS,
  zoneForLevel,
  type ExerciseId,
  type WorkInput,
  type Workout,
  type WorkoutPlan,
} from '../game';
import { useRepInput, type RepEvent, type RepSource } from '../input';
import { useGame, type ExerciseResult, type WorkResult } from '../state/GameProvider';
import { BattleArena } from '../ui/components/BattleArena';
import { DailyQuestCard } from '../ui/components/DailyQuestCard';
import { ExerciseGuideModal } from '../ui/components/ExerciseGuideModal';
import { HpBar } from '../ui/components/HpBar';
import { LevelUpBanner, type LevelUpEvent } from '../ui/components/LevelUpBanner';
import { ComboBadge } from '../ui/components/ComboBadge';
import { PlanCard } from '../ui/components/PlanCard';
import { VoiceToggle } from '../ui/components/VoiceToggle';
import { SessionGoalCard } from '../ui/components/SessionGoalCard';
import { SetReviewModal, type SetReview } from '../ui/components/SetReviewModal';
import { WeeklyBossBar } from '../ui/components/WeeklyBossBar';
import { WeeklyGoalCard } from '../ui/components/WeeklyGoalCard';
import { WorkoutProgress } from '../ui/components/WorkoutProgress';
import { formatAmount, formatCompact, formatDayShort, formatNumber } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { useHitQueue } from '../ui/useHitQueue';
import { stopSpeaking } from '../ui/voice';
import { useWorkout } from '../ui/useWorkout';

const KEEP_AWAKE_TAG = 'fight';
const LEVEL_UP_BANNER_MS = 2500;
const MESSAGE_MS = 3000;
const EXERCISE_DONE_MESSAGE_MS = 6000;
/** The review sheet opens once the camera has slid away (iOS can't show two modals at once). */
const REVIEW_DELAY_MS = 600;

const toWorkInput = (event: RepEvent): WorkInput =>
  event.type === 'reps' ? { kind: 'reps', count: event.count } : { kind: 'seconds', seconds: event.seconds };
const amountOf = (event: RepEvent) => (event.type === 'reps' ? event.count : event.seconds);

function describe(outcome: WorkResult): string[] {
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
  if (outcome.weeklyBossGold !== null) parts.push(`👑 Weekly Titan defeated! +${formatNumber(outcome.weeklyBossGold)} gold`);
  if (outcome.weeklyGoalGold !== null) parts.push(`📅 Weekly goal met! +${formatNumber(outcome.weeklyGoalGold)} gold`);
  for (const step of outcome.skillSteps) {
    parts.push(`${step.icon} Skill ${step.name}: step ${step.done}/${step.total}${step.done === step.total ? ' — mastered!' : ''}`);
  }
  for (const up of outcome.levelUps) parts.push(`${MUSCLE_NAMES[up.muscle]} reached level ${up.level}!`);
  for (const a of outcome.achievements) parts.push(`🏆 Achievement: ${a.name} · +${formatNumber(a.gold)} gold`);
  return parts;
}

/** End of an exercise: the record (best session) it beat and the achievements that followed. */
function describeEnd(exerciseId: ExerciseId, total: number, result: ExerciseResult): string[] {
  const parts = [`✓ Exercise complete: ${formatAmount(exerciseId, total)}`];
  if (result.record) {
    parts.push(
      `🏅 New record: ${formatAmount(exerciseId, result.record.amount)} in one session (was ${formatAmount(exerciseId, result.record.previous)}) · +${formatNumber(result.record.gold)} gold`,
    );
  }
  for (const a of result.achievements) parts.push(`🏆 Achievement: ${a.name} · +${formatNumber(a.gold)} gold`);
  return parts;
}

export default function CombatScreen() {
  const {
    state,
    quest,
    settings,
    work,
    finishExercise,
    refreshQuest,
    setSessionGoal,
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
  const [lastDone, setLastDone] = useState<Record<string, { day: string; amount: number; best: number; sets: number }>>({});
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

  // The plan (sets × reps) offered for this exercise: the player's own choice, else a suggestion.
  const [customPlans, setCustomPlans] = useState<Partial<Record<ExerciseId, { sets: number; perSet: number }>>>({});
  const last = lastDone[exerciseId];
  const suggested = useMemo(
    () =>
      suggestPlan(exerciseId, quest, last ? { total: last.amount, best: last.best, sets: last.sets } : null, settings.restTimerSeconds),
    [exerciseId, quest, last, settings.restTimerSeconds],
  );
  const custom = customPlans[exerciseId];
  const plan: WorkoutPlan = custom ? { ...custom, restSeconds: settings.restTimerSeconds } : suggested;
  const planNote = custom
    ? 'Your plan'
    : quest && quest.exerciseId === exerciseId && !quest.completed
      ? 'From today’s quest'
      : last
        ? 'Same as last time'
        : 'A first plan for you';

  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMessage = (lines: string[], ms = MESSAGE_MS) => {
    if (lines.length === 0) return;
    setMessage(lines.slice(-4).join('\n'));
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), ms);
  };
  const levelUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Plays the strikes of some work and shows what it earned. Returns the lines to show. */
  const playOutcome = (outcome: WorkResult, burst: boolean): string[] => {
    enqueue(outcome.hits, burst);
    if (outcome.hits.length > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (outcome.levelUps.length > 0) {
      setLevelUp((prev) => ({ key: (prev?.key ?? 0) + 1, levelUps: outcome.levelUps }));
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
      levelUpTimer.current = setTimeout(() => setLevelUp(null), LEVEL_UP_BANNER_MS);
    }
    return describe(outcome);
  };

  /** The exercise is over: checks the personal record (best session) and says how it went. */
  const endExercise = (id: ExerciseId, total: number, lines: string[] = []) => {
    if (total <= 0) return;
    finishExercise(id).then(
      (result) => showMessage([...lines, ...describeEnd(id, total, result)], EXERCISE_DONE_MESSAGE_MS),
      () => showMessage(lines),
    );
  };

  // Refs: the rep listener and the workout callbacks always see the latest values.
  const sourceRef = useRef<RepSource | null>(null);
  const reviewRef = useRef(false);
  const handsFreeRef = useRef(false);
  const exerciseRef = useRef(exerciseId);
  exerciseRef.current = exerciseId;
  const planRef = useRef(plan);
  planRef.current = plan;
  const [cameraOpen, setCameraOpen] = useState(false);
  const [review, setReview] = useState<SetReview | null>(null);
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openReview = (next: SetReview) => {
    if (reviewTimer.current) clearTimeout(reviewTimer.current);
    reviewTimer.current = setTimeout(() => setReview(next), REVIEW_DELAY_MS);
  };

  const workout = useWorkout({
    voice: settings.voiceCount,
    autoEndWhenIdle: handsFreeRef.current,
    onSetDone: () => {
      sourceRef.current?.endSet();
      if (!reviewRef.current) closeSet();
    },
    onDone: (done: Workout) => {
      sourceRef.current?.endSet();
      workout.reset();
      const amounts = done.amounts.filter((a) => a > 0);
      if (reviewRef.current) {
        // Camera: it closes by itself, then the player checks the counts.
        setCameraOpen(false);
        openReview({ exerciseId: done.exerciseId, amounts });
      } else {
        endExercise(done.exerciseId, amounts.reduce((sum, a) => sum + a, 0));
      }
    },
  });

  const startCamera = () => {
    workout.start(exerciseId, plan);
    setCameraOpen(true);
  };
  const stopCamera = () => {
    const current = workout.current();
    const amounts = workout.stop();
    setCameraOpen(false);
    if (current && amounts.length > 0) openReview({ exerciseId: current.exerciseId, amounts });
  };
  /** Manual mode: the player stops before the last set. */
  const endWorkout = () => {
    const current = workout.current();
    const amounts = workout.stop();
    sourceRef.current?.endSet();
    closeSet();
    if (current) endExercise(current.exerciseId, amounts.reduce((sum, a) => sum + a, 0));
  };

  /** The camera counts were checked: now they strike, one set after another. */
  const confirmReview = (amounts: number[]) => {
    const checked = review;
    setReview(null);
    if (!checked) return;
    const unit = getExercise(checked.exerciseId).unit;
    const lines: string[] = [];
    let total = 0;
    for (const amount of amounts) {
      if (amount <= 0) continue;
      total += amount;
      const input: WorkInput = unit === 'seconds' ? { kind: 'seconds', seconds: amount } : { kind: 'reps', count: amount };
      lines.push(...playOutcome(work(checked.exerciseId, input, { newSet: true }), true));
    }
    closeSet();
    showMessage(lines);
    endExercise(checked.exerciseId, total, lines);
  };

  const hud = workout.workout ? <WorkoutProgress workout={workout.workout} compact /> : null;
  const { source, controls, reviewCounts, handsFree } = useRepInput({
    mode: settings.inputMode,
    exerciseId,
    active: focused,
    repsPerPress: settings.repsPerPress,
    onRepsPerPressChange: (repsPerPress) => updateSettings({ repsPerPress }),
    cameraRunning: cameraOpen,
    onCameraStart: startCamera,
    onCameraStop: stopCamera,
    cameraOverlay: hud,
    hideCameraImage: settings.hideCameraImage,
    onHideCameraImageChange: (hideCameraImage) => updateSettings({ hideCameraImage }),
    calibrations,
    onCalibrated: setCalibration,
    largeButtons: settings.largeButtons,
  });
  sourceRef.current = source;
  reviewRef.current = reviewCounts;
  handsFreeRef.current = handsFree;

  // Leaving the tab closes the camera: what was counted is checked on return.
  useEffect(() => {
    if (!focused && cameraOpen) stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);
  // Switching between camera and manual mode ends the exercise in progress (manual sets already count).
  const previousMode = useRef(settings.inputMode);
  useEffect(() => {
    if (previousMode.current === settings.inputMode) return;
    const wasManual = previousMode.current === 'manual';
    previousMode.current = settings.inputMode;
    if (wasManual && workout.current()) endWorkout();
    else workout.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.inputMode]);

  useEffect(() => {
    let cancelled = false;
    repository.lastDoneByExercise().then((map) => {
      if (!cancelled) setLastDone(map);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, dataVersion]);

  const selectExercise = (id: ExerciseId) => {
    if (id === exerciseId) return;
    // Changing exercise ends the one in progress (manual mode: its sets already count).
    if (workout.current() && !reviewRef.current) endWorkout();
    else workout.reset();
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
  useEffect(
    () =>
      source.subscribe((event) => {
        const amount = amountOf(event);
        if (reviewRef.current) {
          // Counted now, applied after the player checks the counts. Moving around during the rest doesn't count.
          if (workout.current()?.phase === 'work') workout.add(amount);
          return;
        }
        const current = workout.current();
        if (!current || current.phase === 'done' || current.exerciseId !== exerciseRef.current) {
          workout.start(exerciseRef.current, planRef.current);
        }
        showMessage(playOutcome(work(exerciseRef.current, toWorkInput(event)), event.type === 'reps' && event.burst));
        workout.add(amount);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, work, enqueue],
  );
  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
      if (reviewTimer.current) clearTimeout(reviewTimer.current);
      stopSpeaking();
    },
    [],
  );

  const isFavorite = settings.favorites.includes(exerciseId);
  const toggleFavorite = () =>
    updateSettings({
      favorites: isFavorite ? settings.favorites.filter((f) => f !== exerciseId) : [...settings.favorites, exerciseId],
    });
  const record = state.sessionRecords[exerciseId];
  const lastDoneText = last
    ? `Last time: ${formatAmount(exerciseId, last.amount)} · ${last.day === today ? 'today' : formatDayShort(last.day)}`
    : 'Never done yet — take it easy the first time.';

  // Best set good enough: suggest the harder variation (switching difficulty if it isn't offered yet).
  const harder = nextVariation(exerciseId, state.records);
  const harderOffered = harder !== null && exercises.some((e) => e.id === harder);
  const tierUp = harder ? (
    <View style={styles.tierUp}>
      <Text style={styles.tierUpText}>
        💪 {formatAmount(exerciseId, state.records[exerciseId] ?? 0)} in one set: ready for {getExercise(harder).name}?
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          if (!harderOffered) updateSettings({ difficulty: getExercise(harder).tier });
          selectExercise(harder);
        }}
      >
        <Text style={styles.howTo}>
          {harderOffered ? 'Try it →' : `Unlock (${DIFFICULTY_NAMES[getExercise(harder).tier]} mode) →`}
        </Text>
      </Pressable>
    </View>
  ) : null;
  const showSessionGoal =
    settings.askSessionGoal && quest !== null && quest.day === today && quest.goal === null && quest.progress === 0 && !quest.completed;

  const enemy = frame.enemy ?? state.enemy;
  const boss = isBossStage(enemy.stage);
  const zone = zoneForLevel(enemy.level);
  const weaponTier = WEAPONS.findIndex((w) => w.id === state.weaponId);
  const weak = enemyWeakness(enemy.level, enemy.stage);
  const hitsWeakness = weak === exerciseStyle(exercise);
  // Manual mode: the exercise in progress replaces the plan until it is over.
  const inProgress = workout.workout !== null && !reviewCounts ? workout.workout : null;

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
            <Text style={[styles.weakness, hitsWeakness && styles.weaknessHit]}>
              Weak to {STYLE_NAMES[weak]}
              {hitsWeakness ? ` · your exercise hits it: +${Math.round(WEAKNESS.damageBonus * 100)}% damage!` : ''}
            </Text>
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

          {showSessionGoal && quest ? (
            <SessionGoalCard quest={quest} onPick={setSessionGoal} onNeverAsk={() => updateSettings({ askSessionGoal: false })} />
          ) : null}

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
              const suggestedChip = exerciseStyle(e) === suggestedStyle;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => selectExercise(e.id as ExerciseId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    suggestedChip && styles.chipSuggested,
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
            {record ? ` · Record: ${formatAmount(exerciseId, record.amount)} in one session` : ''}
          </Text>

          {tierUp}

          {inProgress ? (
            <>
              <WorkoutProgress
                workout={inProgress}
                onFinishSet={workout.finishSet}
                onEnd={endWorkout}
                onSkipRest={workout.skipRest}
                largeButtons={settings.largeButtons}
              />
              <VoiceToggle value={settings.voiceCount} onChange={setVoiceCount} />
            </>
          ) : (
            <PlanCard
              exerciseId={exerciseId}
              plan={plan}
              onChange={({ sets, perSet }) => setCustomPlans((plans) => ({ ...plans, [exerciseId]: { sets, perSet } }))}
              onRestChange={(restTimerSeconds) => updateSettings({ restTimerSeconds })}
              voice={settings.voiceCount}
              onVoiceChange={setVoiceCount}
              note={planNote}
            />
          )}
          {controls}
          {!inProgress && !reviewCounts ? (
            <Text style={[styles.muted, styles.center]}>
              {exercise.unit === 'seconds'
                ? 'Hold the position: one sword strike every few seconds.'
                : 'Every rep is a sword strike.'}
            </Text>
          ) : null}

          <WeeklyGoalCard state={state} today={today} />
          <DailyQuestCard quest={quest} state={state} selected={exerciseId} onSelect={selectExercise} onHowTo={setGuideFor} />
          <WeeklyBossBar state={state} today={today} />
        </ScrollView>
      </KeyboardAvoidingView>
      <ExerciseGuideModal exerciseId={guideFor} onClose={() => setGuideFor(null)} />
      <SetReviewModal key={review ? `${review.exerciseId}-${review.amounts.join()}` : 'none'} review={focused ? review : null} onConfirm={confirmReview} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  center: { textAlign: 'center' },
  tierUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rested,
  },
  tierUpText: { color: colors.text, fontSize: 13, flex: 1 },
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
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  exerciseName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 18, flexShrink: 1, flex: 1 },
  howTo: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 14 },
});
