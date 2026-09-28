import { useCallback, useEffect, useRef, useState } from 'react';

import type { BossState, Hit } from '../game';

export interface HitFrame {
  /** Increments on every played hit, drives the animations. */
  seq: number;
  hit: Hit | null;
  /** Boss as it should look right now (lags behind the real state during a burst). */
  boss: BossState | null;
}

const DEFEAT_PAUSE_MS = 700;
const TAP_INTERVAL_MS = 120;

/**
 * Plays hits one after another so bursts ("Ajouter un nombre") animate quickly
 * instead of all at once, while the game state is already up to date.
 */
export function useHitQueue(): { frame: HitFrame; enqueue: (hits: Hit[], burst: boolean) => void } {
  const [frame, setFrame] = useState<HitFrame>({ seq: 0, hit: null, boss: null });
  const queue = useRef<{ hit: Hit; delay: number }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const playNext = useCallback(() => {
    const next = queue.current.shift();
    if (!next) {
      timer.current = null;
      setFrame((f) => ({ ...f, boss: null }));
      return;
    }
    const { hit, delay } = next;
    seq.current += 1;
    setFrame({
      seq: seq.current,
      hit,
      boss: { index: hit.bossIndex, hp: hit.bossHpAfter, maxHp: hit.bossMaxHp },
    });
    timer.current = setTimeout(playNext, hit.defeated ? Math.max(delay, DEFEAT_PAUSE_MS) : delay);
  }, []);

  const enqueue = useCallback(
    (hits: Hit[], burst: boolean) => {
      if (hits.length === 0) return;
      const delay = burst ? Math.min(160, Math.max(35, 2000 / hits.length)) : TAP_INTERVAL_MS;
      queue.current.push(...hits.map((hit) => ({ hit, delay })));
      if (timer.current === null) playNext();
    },
    [playNext],
  );

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return { frame, enqueue };
}
