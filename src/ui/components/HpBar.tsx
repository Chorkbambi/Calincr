import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '../theme';

/** Boss health bar that slides down on every hit and refills instantly for a new boss. */
export function HpBar({ hp, maxHp, bossIndex }: { hp: number; maxHp: number; bossIndex: number }) {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  const value = useSharedValue(ratio);
  const trail = useSharedValue(ratio);
  const lastBoss = useRef(bossIndex);

  useEffect(() => {
    if (lastBoss.current !== bossIndex) {
      lastBoss.current = bossIndex;
      value.value = ratio;
      trail.value = ratio;
      return;
    }
    value.value = withTiming(ratio, { duration: 140 });
    trail.value = withTiming(ratio, { duration: 600 });
  }, [ratio, bossIndex, value, trail]);

  const fill = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));
  const trailFill = useAnimatedStyle(() => ({ width: `${trail.value * 100}%` }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.bar, styles.trail, trailFill]} />
      <Animated.View style={[styles.bar, styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderColor: colors.goldDark,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  trail: { backgroundColor: colors.goldLight, opacity: 0.6 },
  fill: { backgroundColor: colors.blood },
});
