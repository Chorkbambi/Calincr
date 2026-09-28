import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  applyWork,
  createInitialState,
  recordWork,
  type ExerciseId,
  type GameState,
  type SetRecord,
  type WorkInput,
  type WorkOutcome,
} from '../game';
import { GameRepository } from '../storage/repository';

interface GameContextValue {
  state: GameState;
  openSet: SetRecord | null;
  repository: GameRepository;
  /** Increments after every saved change, so screens can reload their queries. */
  dataVersion: number;
  work(exerciseId: ExerciseId, input: WorkInput): WorkOutcome;
  closeSet(): void;
  resetProgress(): Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function GameProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const db = useSQLiteContext();
  const repository = useMemo(() => new GameRepository(db), [db]);
  const [state, setState] = useState<GameState | null>(null);
  const [openSet, setOpenSet] = useState<SetRecord | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  // Refs hold the latest values so several reps in the same frame chain correctly.
  const stateRef = useRef<GameState | null>(null);
  const setRef = useRef<SetRecord | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    repository.loadState().then((loaded) => {
      if (cancelled) return;
      stateRef.current = loaded;
      setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const work = useCallback(
    (exerciseId: ExerciseId, input: WorkInput): WorkOutcome => {
      const current = stateRef.current ?? createInitialState();
      const now = new Date();
      const result = applyWork(current, exerciseId, input, now);
      const set = result.outcome.amount > 0 ? recordWork(setRef.current, result.outcome, now, newId) : setRef.current;
      stateRef.current = result.state;
      setRef.current = set;
      setState(result.state);
      setOpenSet(set);
      const defeated = result.outcome.defeatedBosses;
      saveQueue.current = saveQueue.current
        .then(() => repository.saveProgress(result.state, set, defeated))
        .then(() => setDataVersion((v) => v + 1))
        .catch((error: unknown) => console.warn('Sauvegarde impossible', error));
      return result.outcome;
    },
    [repository],
  );

  const closeSet = useCallback(() => {
    setRef.current = null;
    setOpenSet(null);
  }, []);

  const resetProgress = useCallback(async () => {
    await saveQueue.current;
    await repository.resetAll();
    const fresh = createInitialState();
    stateRef.current = fresh;
    setRef.current = null;
    setState(fresh);
    setOpenSet(null);
    setDataVersion((v) => v + 1);
  }, [repository]);

  const value = useMemo<GameContextValue | null>(
    () => (state ? { state, openSet, repository, dataVersion, work, closeSet, resetProgress } : null),
    [state, openSet, repository, dataVersion, work, closeSet, resetProgress],
  );

  if (!value) return <>{fallback}</>;
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}
