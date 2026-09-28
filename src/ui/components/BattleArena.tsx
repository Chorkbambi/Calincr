import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { enemyLook, isBossStage, zoneForLevel, type EnemyState } from '../../game';
import { colors, fonts } from '../theme';
import type { HitFrame } from '../useHitQueue';
import { EnemyFigure } from './EnemyFigure';
import { SwordFigure } from './SwordFigure';
import { ZoneBackdrop } from './ZoneBackdrop';

const POPUP_MS = 750;

function DamagePopup({ damage, offset }: { damage: number; offset: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: POPUP_MS, easing: Easing.out(Easing.quad) });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.6 ? 1 : 1 - (progress.value - 0.6) / 0.4,
    transform: [{ translateY: -70 * progress.value }, { translateX: offset }, { scale: 1.3 - 0.3 * progress.value }],
  }));
  return <Animated.Text style={[styles.damage, style]}>-{damage}</Animated.Text>;
}

/** Zone scenery, enemy, sword and damage numbers, animated on every played hit. */
export function BattleArena({ enemy, frame, weaponTier }: { enemy: EnemyState; frame: HitFrame; weaponTier: number }) {
  const swing = useSharedValue(0);
  const flinch = useSharedValue(0);
  const presence = useSharedValue(1);
  const [popups, setPopups] = useState<{ id: number; damage: number; offset: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const hit = frame.hit;
    if (!hit) return;
    swing.value = withSequence(
      withTiming(-55, { duration: 60 }),
      withTiming(35, { duration: 70, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 180 }),
    );
    flinch.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 260 }));
    const popup = { id: frame.seq, damage: hit.damage, offset: ((frame.seq * 37) % 60) - 30 };
    setPopups((p) => [...p.slice(-6), popup]);
    const t = setTimeout(() => setPopups((p) => p.filter((x) => x.id !== popup.id)), POPUP_MS);
    timers.current.push(t);
  }, [frame.seq, frame.hit, swing, flinch]);

  // Fade out a defeated enemy, grow the next one in.
  const defeated = enemy.hp === 0;
  const enemyKey = enemy.level * 1000 + enemy.stage;
  const boss = isBossStage(enemy.stage);
  useEffect(() => {
    presence.value = defeated
      ? withTiming(0, { duration: 500 })
      : withSequence(withTiming(0.6, { duration: 0 }), withTiming(1, { duration: 320, easing: Easing.out(Easing.back(2)) }));
  }, [defeated, enemyKey, presence]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const bossStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [
      { translateX: flinch.value * 12 },
      { rotate: `${flinch.value * 4}deg` },
      { scale: presence.value * (1 - flinch.value * 0.05) },
    ],
  }));
  const hurtStyle = useAnimatedStyle(() => ({ opacity: flinch.value * 0.45 }));
  const swordStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));

  return (
    <View style={styles.arena}>
      <ZoneBackdrop scenery={zoneForLevel(enemy.level).scenery} />
      <Animated.View style={[styles.boss, bossStyle]}>
        <EnemyFigure look={enemyLook(enemy.level, enemy.stage)} boss={boss} size={boss ? 210 : 170} />
        <Animated.View pointerEvents="none" style={[styles.hurt, hurtStyle]} />
      </Animated.View>
      <Animated.View style={[styles.sword, swordStyle]}>
        <SwordFigure size={150} tier={weaponTier} />
      </Animated.View>
      <View pointerEvents="none" style={styles.popups}>
        {popups.map((p) => (
          <DamagePopup key={p.id} damage={p.damage} offset={p.offset} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.goldDark,
  },
  boss: { alignItems: 'center', justifyContent: 'center' },
  hurt: {
    position: 'absolute',
    top: 50,
    width: 150,
    height: 140,
    borderRadius: 75,
    backgroundColor: colors.blood,
  },
  sword: {
    position: 'absolute',
    right: 24,
    bottom: 6,
    transformOrigin: 'bottom center',
    transform: [{ rotate: '0deg' }],
  },
  popups: { position: 'absolute', top: 30, left: 0, right: 0, alignItems: 'center' },
  damage: {
    position: 'absolute',
    color: '#ff5a4a',
    fontFamily: fonts.titleBold,
    fontSize: 32,
    textShadowColor: '#000',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
});
