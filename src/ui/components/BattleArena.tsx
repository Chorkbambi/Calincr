import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { BossState } from '../../game';
import { colors, fonts } from '../theme';
import type { HitFrame } from '../useHitQueue';
import { BossFigure } from './BossFigure';
import { SwordFigure } from './SwordFigure';

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

/** Boss, sword and damage numbers, animated on every played hit. */
export function BattleArena({ boss, frame }: { boss: BossState; frame: HitFrame }) {
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

  // Fade out a defeated boss, grow the next one in.
  const defeated = boss.hp === 0;
  useEffect(() => {
    presence.value = defeated
      ? withTiming(0, { duration: 500 })
      : withSequence(withTiming(0.6, { duration: 0 }), withTiming(1, { duration: 320, easing: Easing.out(Easing.back(2)) }));
  }, [defeated, boss.index, presence]);

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
      <View style={styles.glow} />
      <Animated.View style={[styles.boss, bossStyle]}>
        <BossFigure index={boss.index} size={190} />
        <Animated.View pointerEvents="none" style={[styles.hurt, hurtStyle]} />
      </Animated.View>
      <Animated.View style={[styles.sword, swordStyle]}>
        <SwordFigure size={150} />
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
  arena: { height: 240, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: colors.stoneLight,
    opacity: 0.5,
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
