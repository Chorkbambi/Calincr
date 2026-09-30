import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  addDays,
  applyQuestReward,
  applyWork,
  buyWeapon,
  checkAchievements,
  createBackup,
  createDailyQuest,
  createInitialState,
  DEFAULT_SETTINGS,
  equipWeapon,
  parseBackup,
  progressQuest,
  QUEST,
  questNeedsRefresh,
  recordWork,
  seedRecords,
  trackRecord,
  type NewRecord,
  toDayKey,
  type BackupError,
  type DailyQuest,
  type ExerciseId,
  type GameState,
  type SetRecord,
  type Settings,
  type ShopError,
  type WeaponId,
  type WorkInput,
  type WorkOutcome,
} from '../game';
import { cancelDailyReminder, scheduleDailyReminder } from '../notifications/reminders';
import { restoreCalibrations, type Calibrations } from '../pose/calibration';
import type { TrackerConfig } from '../pose/trackers';
import { GameRepository } from '../storage/repository';

export type UnlockedAchievement = { id: string; name: string; gold: number };

/** Outcome of some work, plus the daily quest reward and achievements it triggered. */
export type WorkResult = WorkOutcome & {
  questCompleted: DailyQuest | null;
  achievements: UnlockedAchievement[];
  record: NewRecord | null;
  /** Total of the open set after this work (reps, or seconds for holds). */
  setAmount: number;
};

/** A shop operation: returns the new state or an error. */
export type ShopOperation = (state: GameState) => { state: GameState } | { error: ShopError };

interface GameContextValue {
  state: GameState;
  /** Today's quest (null until generated). */
  quest: DailyQuest | null;
  settings: Settings;
  openSet: SetRecord | null;
  repository: GameRepository;
  /** Increments after every saved change, so screens can reload their queries. */
  dataVersion: number;
  work(exerciseId: ExerciseId, input: WorkInput): WorkResult;
  /** Creates today's quest if needed (new day, difficulty change). */
  refreshQuest(): void;
  closeSet(): void;
  buy(weaponId: WeaponId): ShopError | null;
  equip(weaponId: WeaponId): ShopError | null;
  /** Any other shop operation (gear, cosmetics, streak freeze). */
  transact(operation: ShopOperation): ShopError | null;
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(): Promise<void>;
  /** Player-specific camera thresholds, per exercise. */
  calibrations: Calibrations;
  setCalibration(exerciseId: ExerciseId, tracker: TrackerConfig | null): void;
  /** JSON text of a full backup. */
  exportBackup(): Promise<string>;
  /** Replaces everything with a backup file's content. Returns an error code, or null on success. */
  importBackup(text: string): Promise<BackupError | null>;
  /** Achievements unlocked outside of a workout (e.g. buying a sword), to show once. */
  pendingAchievements: UnlockedAchievement[];
  clearPendingAchievements(): void;
}

const GameContext = createContext<GameContextValue | null>(null);

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function GameProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const db = useSQLiteContext();
  const repository = useMemo(() => new GameRepository(db), [db]);
  const [state, setState] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [openSet, setOpenSet] = useState<SetRecord | null>(null);
  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const questRef = useRef<DailyQuest | null>(null);
  const questLoading = useRef(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [calibrations, setCalibrations] = useState<Calibrations>({});
  const calibrationsRef = useRef<Calibrations>({});
  const [pendingAchievements, setPendingAchievements] = useState<UnlockedAchievement[]>([]);
  // Refs hold the latest values so several reps in the same frame chain correctly.
  const stateRef = useRef<GameState | null>(null);
  const setRef = useRef<SetRecord | null>(null);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  /** Serializes writes so they land in order. */
  const enqueueSave = useCallback((save: () => Promise<void>) => {
    saveQueue.current = saveQueue.current
      .then(save)
      .then(() => setDataVersion((v) => v + 1))
      .catch((error: unknown) => console.warn('Save failed', error));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      repository.loadState(),
      repository.loadSettings(),
      repository.loadQuest(),
      repository.loadCalibrations(),
      repository.bestSetByExercise(),
    ]).then(
      ([stored, loadedSettings, loadedQuest, loadedCalibrations, bestSets]) => {
        if (cancelled) return;
        // Saves from before personal records existed: start from the best sets in the history.
        const loaded = seedRecords(stored, bestSets);
        calibrationsRef.current = loadedCalibrations;
        setCalibrations(loadedCalibrations);
        stateRef.current = loaded;
        settingsRef.current = loadedSettings;
        questRef.current = loadedQuest;
        setSettings(loadedSettings);
        setQuest(loadedQuest);
        setState(loaded);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const commitState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const refreshQuest = useCallback(() => {
    const today = toDayKey(new Date());
    if (!stateRef.current || questLoading.current) return;
    if (!questNeedsRefresh(questRef.current, today, settingsRef.current.difficulty)) return;
    questLoading.current = true;
    repository
      .listSets(addDays(today, -QUEST.historyDays), addDays(today, -1))
      .then((history) => {
        const current = stateRef.current;
        if (!current || !questNeedsRefresh(questRef.current, today, settingsRef.current.difficulty)) return;
        const previous = questRef.current;
        const next = createDailyQuest(current, today, settingsRef.current.difficulty, history, previous);
        questRef.current = next;
        setQuest(next);
        enqueueSave(() => repository.saveQuest(next));
      })
      .catch((error: unknown) => console.warn('Quest creation failed', error))
      .finally(() => {
        questLoading.current = false;
      });
  }, [repository, enqueueSave, commitState]);

  useEffect(() => {
    if (state) refreshQuest();
  }, [state === null, settings.difficulty, refreshQuest]); // eslint-disable-line react-hooks/exhaustive-deps

  const work = useCallback(
    (exerciseId: ExerciseId, input: WorkInput): WorkResult => {
      const current = stateRef.current ?? createInitialState();
      const now = new Date();
      const result = applyWork(current, exerciseId, input, now);
      let nextState = result.state;
      const outcome: WorkResult = { ...result.outcome, questCompleted: null, achievements: [], record: null, setAmount: 0 };
      let nextQuest: DailyQuest | null = null;
      if (questRef.current) {
        const progressed = progressQuest(questRef.current, result.outcome);
        if (progressed.quest !== questRef.current) {
          nextQuest = progressed.quest;
          questRef.current = nextQuest;
          setQuest(nextQuest);
          if (progressed.justCompleted) {
            const rewarded = applyQuestReward(nextState, nextQuest);
            nextState = rewarded.state;
            outcome.levelUps = [...outcome.levelUps, ...rewarded.levelUps];
            outcome.questCompleted = nextQuest;
          }
        }
      }
      const set = result.outcome.amount > 0 ? recordWork(setRef.current, result.outcome, now, newId) : setRef.current;
      setRef.current = set;
      outcome.setAmount = set?.amount ?? 0;
      if (set && result.outcome.amount > 0) {
        const tracked = trackRecord(nextState, exerciseId, set.id, set.amount);
        nextState = tracked.state;
        outcome.record = tracked.record;
        if (tracked.record) outcome.goldEarned += tracked.record.gold;
      }
      const checked = checkAchievements(nextState);
      nextState = checked.state;
      outcome.achievements = checked.unlocked;
      commitState(nextState);
      setOpenSet(set);
      const kills = result.outcome.kills;
      const saved = nextState;
      enqueueSave(() => repository.saveProgress(saved, set, kills, nextQuest));
      // First workout after midnight: today's quest replaces yesterday's.
      if (questRef.current?.day !== result.outcome.day) refreshQuest();
      return outcome;
    },
    [repository, commitState, enqueueSave, refreshQuest],
  );

  const closeSet = useCallback(() => {
    setRef.current = null;
    setOpenSet(null);
  }, []);

  const transact = useCallback(
    (operation: ShopOperation): ShopError | null => {
      const result = operation(stateRef.current ?? createInitialState());
      if ('error' in result) return result.error;
      const checked = checkAchievements(result.state);
      if (checked.unlocked.length > 0) setPendingAchievements((p) => [...p, ...checked.unlocked]);
      commitState(checked.state);
      enqueueSave(() => repository.saveState(checked.state));
      return null;
    },
    [repository, commitState, enqueueSave],
  );
  const buy = useCallback((id: WeaponId) => transact((s) => buyWeapon(s, id)), [transact]);
  const equip = useCallback((id: WeaponId) => transact((s) => equipWeapon(s, id)), [transact]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      enqueueSave(() => repository.saveSettings(next));
    },
    [repository, enqueueSave],
  );

  const resetProgress = useCallback(async () => {
    await saveQueue.current;
    await repository.resetAll();
    setRef.current = null;
    questRef.current = null;
    setQuest(null);
    commitState(createInitialState());
    setOpenSet(null);
    setDataVersion((v) => v + 1);
  }, [repository, commitState]);

  const setCalibration = useCallback(
    (exerciseId: ExerciseId, tracker: TrackerConfig | null) => {
      const next = { ...calibrationsRef.current };
      if (tracker) next[exerciseId] = tracker;
      else delete next[exerciseId];
      calibrationsRef.current = next;
      setCalibrations(next);
      enqueueSave(() => repository.saveCalibrations(next));
    },
    [repository, enqueueSave],
  );

  const exportBackup = useCallback(async () => {
    await saveQueue.current;
    return JSON.stringify(createBackup(await repository.exportAll(), new Date()));
  }, [repository]);

  const importBackup = useCallback(
    async (text: string): Promise<BackupError | null> => {
      const parsed = parseBackup(text);
      if ('error' in parsed) return parsed.error;
      await saveQueue.current;
      const imported = restoreCalibrations(parsed.data.calibrations);
      await repository.importAll(parsed.data, imported);
      setRef.current = null;
      setOpenSet(null);
      calibrationsRef.current = imported;
      setCalibrations(imported);
      const hadReminder = settingsRef.current.reminder.enabled;
      settingsRef.current = parsed.data.settings;
      setSettings(parsed.data.settings);
      const { reminder } = parsed.data.settings;
      if (reminder.enabled) void scheduleDailyReminder(reminder.hour, reminder.minute);
      else if (hadReminder) void cancelDailyReminder();
      questRef.current = parsed.data.quest;
      setQuest(parsed.data.quest);
      commitState(parsed.data.state);
      setDataVersion((v) => v + 1);
      return null;
    },
    [repository, commitState],
  );

  const clearPendingAchievements = useCallback(() => setPendingAchievements([]), []);

  const value = useMemo<GameContextValue | null>(
    () =>
      state
        ? {
            state,
            quest,
            settings,
            openSet,
            repository,
            dataVersion,
            work,
            refreshQuest,
            closeSet,
            buy,
            equip,
            transact,
            updateSettings,
            resetProgress,
            calibrations,
            setCalibration,
            exportBackup,
            importBackup,
            pendingAchievements,
            clearPendingAchievements,
          }
        : null,
    [
      state,
      quest,
      settings,
      openSet,
      repository,
      dataVersion,
      work,
      refreshQuest,
      closeSet,
      buy,
      equip,
      transact,
      updateSettings,
      resetProgress,
      calibrations,
      setCalibration,
      exportBackup,
      importBackup,
      pendingAchievements,
      clearPendingAchievements,
    ],
  );

  if (!value) return <>{fallback}</>;
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}
