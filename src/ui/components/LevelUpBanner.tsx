import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { MUSCLE_NAMES, type MuscleId } from '../../game';
import { formatNumber } from '../format';
import { colors, fonts, radius, spacing } from '../theme';

export interface LevelUpEvent {
  /** Changes on every celebration so the banner replays its animation. */
  key: number;
  levelUps: { muscle: MuscleId; level: number }[];
}

/** Big "LEVEL UP" banner shown over the arena for a moment when muscles gain a level. */
export function LevelUpBanner({ event, damage }: { event: LevelUpEvent | null; damage: number }) {
  if (!event || event.levelUps.length === 0) return null;
  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View key={event.key} entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(400)} style={styles.banner}>
        <Text style={styles.title}>⬆ LEVEL UP!</Text>
        {event.levelUps.slice(-3).map((up) => (
          <Text key={`${up.muscle}-${up.level}`} style={styles.line}>
            {MUSCLE_NAMES[up.muscle]} → Lv. {up.level}
          </Text>
        ))}
        <Text style={styles.damage}>Damage per hit: {formatNumber(damage)}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  banner: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: 'rgba(27,21,16,0.92)',
  },
  title: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 26, letterSpacing: 2 },
  line: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 17 },
  damage: { color: colors.rested, fontFamily: fonts.title, fontSize: 14, marginTop: 2 },
});
