import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { REST_OVER_PHRASE } from '../../game';
import { colors, fonts, radius, spacing } from '../theme';
import { say } from '../voice';
import { GoldButton } from './GoldButton';
import { ProgressBar } from './ProgressBar';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Countdown shown after a set; vibrates (and speaks, if the voice count is on) when the rest is over. */
export function RestTimer({
  startedAt,
  seconds,
  onDone,
  voice = false,
}: {
  startedAt: number;
  seconds: number;
  onDone: () => void;
  voice?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, seconds - Math.floor((now - startedAt) / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (left === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (voice) say(REST_OVER_PHRASE);
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={styles.label}>{left > 0 ? 'Rest' : 'Rest over — next set!'}</Text>
        <Text style={styles.time}>{clock(left)}</Text>
      </View>
      <ProgressBar progress={1 - left / seconds} color={left > 0 ? colors.gold : colors.rested} />
      {left > 0 ? <GoldButton label="Skip rest" variant="stone" onPress={onDone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDark,
    backgroundColor: 'rgba(42,35,28,0.95)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 16 },
  time: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 28, fontVariant: ['tabular-nums'] },
});
