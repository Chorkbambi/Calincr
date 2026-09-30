import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';

/** Clear on/off switch for the voice count (reps out loud + "rest over"). */
export function VoiceToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Voice count"
      hitSlop={6}
      style={[styles.pill, value && styles.on]}
    >
      <Text style={[styles.text, value && styles.textOn]}>{value ? '🔊 Voice count: ON' : '🔇 Voice count: OFF'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stone,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  on: { borderColor: colors.rested, backgroundColor: 'rgba(127,176,105,0.15)' },
  text: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 14 },
  textOn: { color: colors.rested },
});
