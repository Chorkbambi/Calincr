import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

export function ProgressBar({ progress, color = colors.gold, height = 8 }: { progress: number; color?: string; height?: number }) {
  const pct = `${Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 10}%` as const;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: pct, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' },
  fill: { height: '100%' },
});
