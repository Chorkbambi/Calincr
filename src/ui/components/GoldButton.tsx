import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';

type Variant = 'gold' | 'stone' | 'danger';

export function GoldButton({
  label,
  onPress,
  variant = 'gold',
  disabled,
  style,
  big,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        big && styles.big,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'gold' ? styles.labelDark : styles.labelLight, big && styles.labelBig]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gold: { backgroundColor: colors.gold, borderColor: colors.goldLight },
  stone: { backgroundColor: colors.stoneLight, borderColor: colors.border },
  danger: { backgroundColor: colors.bloodDark, borderColor: colors.blood },
  big: { paddingVertical: spacing.xl, borderRadius: radius.lg, borderWidth: 2 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.titleBold, fontSize: 15, letterSpacing: 0.5 },
  labelBig: { fontSize: 24, letterSpacing: 2 },
  labelDark: { color: colors.ink },
  labelLight: { color: colors.text },
});
