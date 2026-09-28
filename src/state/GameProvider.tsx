import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  addDays,
  applyQuestReward,
  applyWork,
  buyWeapon,
  createDailyQuest,
  createInitialState,
  DEFAULT_SETTINGS,
  equipWeapon,
  progressQuest,
  QUEST,
  questNeedsRefresh,
  recordWork,
  toDayKey,
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
import { GameRepository } from '../storage/repository';

/** Outcome of some work, plus the daily quest reward when this work completed it. */
export type WorkResult = WorkOutcome & { questCompleted: DailyQuest | null };

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
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(): Promise<void>;
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
    Promise.all([repository.loadState(), repository.loadSettings(), repository.loadQuest()]).then(
      ([loaded, loadedSettings, loadedQuest]) => {
        if (cancelled) return;
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
        const next = createDailyQuest(current, today, settingsRef.current.difficulty, history, questRef.current);
        questRef.current = next;
        setQuest(next);
        enqueueSave(() => repository.saveQuest(next));
      })
      .catch((error: unknown) => console.warn('Quest creation failed', error))
      .finally(() => {
        questLoading.current = false;
      });
  }, [repository, enqueueSave]);

  useEffect(() => {
    if (state) refreshQuest();
  }, [state === null, settings.difficulty, refreshQuest]); // eslint-disable-line react-hooks/exhaustive-deps

  const work = useCallback(
    (exerciseId: ExerciseId, input: WorkInput): WorkResult => {
      const current = stateRef.current ?? createInitialState();
      const now = new Date();
      const result = applyWork(current, exerciseId, input, now);
      let nextState = result.state;
      const outcome: WorkResult = { ...result.outcome, questCompleted: null };
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

  const shopAction = useCallback(
    (action: typeof buyWeapon, weaponId: WeaponId): ShopError | null => {
      const result = action(stateRef.current ?? createInitialState(), weaponId);
      if ('error' in result) return result.error;
      commitState(result.state);
      enqueueSave(() => repository.saveState(result.state));
      return null;
    },
    [repository, commitState, enqueueSave],
  );
  const buy = useCallback((id: WeaponId) => shopAction(buyWeapon, id), [shopAction]);
  const equip = useCallback((id: WeaponId) => shopAction(equipWeapon, id), [shopAction]);

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
            updateSettings,
            resetProgress,
          }
        : null,
    [state, quest, settings, openSet, repository, dataVersion, work, refreshQuest, closeSet, buy, equip, updateSettings, resetProgress],
  );

  if (!value) return <>{fallback}</>;
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}
