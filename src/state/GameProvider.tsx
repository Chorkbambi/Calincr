import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  applyWork,
  buyWeapon,
  createInitialState,
  DEFAULT_SETTINGS,
  equipWeapon,
  recordWork,
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

interface GameContextValue {
  state: GameState;
  settings: Settings;
  openSet: SetRecord | null;
  repository: GameRepository;
  /** Increments after every saved change, so screens can reload their queries. */
  dataVersion: number;
  work(exerciseId: ExerciseId, input: WorkInput): WorkOutcome;
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
    Promise.all([repository.loadState(), repository.loadSettings()]).then(([loaded, loadedSettings]) => {
      if (cancelled) return;
      stateRef.current = loaded;
      settingsRef.current = loadedSettings;
      setSettings(loadedSettings);
      setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const commitState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const work = useCallback(
    (exerciseId: ExerciseId, input: WorkInput): WorkOutcome => {
      const current = stateRef.current ?? createInitialState();
      const now = new Date();
      const result = applyWork(current, exerciseId, input, now);
      const set = result.outcome.amount > 0 ? recordWork(setRef.current, result.outcome, now, newId) : setRef.current;
      setRef.current = set;
      commitState(result.state);
      setOpenSet(set);
      const kills = result.outcome.kills;
      enqueueSave(() => repository.saveProgress(result.state, set, kills));
      return result.outcome;
    },
    [repository, commitState, enqueueSave],
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
    commitState(createInitialState());
    setOpenSet(null);
    setDataVersion((v) => v + 1);
  }, [repository, commitState]);

  const value = useMemo<GameContextValue | null>(
    () =>
      state
        ? { state, settings, openSet, repository, dataVersion, work, closeSet, buy, equip, updateSettings, resetProgress }
        : null,
    [state, settings, openSet, repository, dataVersion, work, closeSet, buy, equip, updateSettings, resetProgress],
  );

  if (!value) return <>{fallback}</>;
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}
