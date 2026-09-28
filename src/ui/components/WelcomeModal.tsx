import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { InputMode } from '../../game';
import { useGame } from '../../state/GameProvider';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

const OPTIONS: { mode: InputMode; title: string; lines: string[] }[] = [
  {
    mode: 'camera',
    title: '📷 Camera',
    lines: [
      'Your phone counts your reps by watching your movements.',
      '🔒 Analysed on your phone only: never recorded, saved or sent.',
      '📴 Works offline: the app never uses the internet.',
      '🙈 You can hide your image and see only a stick figure.',
    ],
  },
  {
    mode: 'manual',
    title: '✋ Manual (no camera)',
    lines: ['You tap the Rep button yourself after each rep (or set).', 'The camera is never used.'],
  },
];

/** First launch: the player chooses how reps are counted, before the camera is ever mentioned by the system. */
export function WelcomeModal() {
  const { settings, updateSettings } = useGame();
  const [choice, setChoice] = useState<InputMode | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);

  return (
    <Modal visible={!settings.onboarded} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Welcome to Calincr</Text>
          <Text style={styles.text}>
            Every real rep you do is a sword strike against a monster. How do you want your reps to be counted?
          </Text>
          {OPTIONS.map((o) => {
            const selected = choice === o.mode;
            return (
              <Pressable
                key={o.mode}
                onPress={() => setChoice(o.mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.card, selected && styles.cardSelected]}
              >
                <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                  {selected ? '◉ ' : '○ '}
                  {o.title}
                </Text>
                {o.lines.map((line) => (
                  <Text key={line} style={styles.line}>
                    {line}
                  </Text>
                ))}
              </Pressable>
            );
          })}
          <Text style={styles.muted}>You can change this at any time in Settings.</Text>
          <Pressable onPress={() => setPolicyOpen(true)} accessibilityRole="link">
            <Text style={styles.link}>Read the privacy policy</Text>
          </Pressable>
        </ScrollView>
        <GoldButton
          big
          label="Let’s fight"
          disabled={choice === null}
          style={styles.button}
          onPress={() => choice && updateSettings({ inputMode: choice, onboarded: true })}
        />
      </View>
      <PrivacyPolicyModal visible={policyOpen} onClose={() => setPolicyOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingBottom: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 28 },
  text: { color: colors.text, fontSize: 16, lineHeight: 22 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stone,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  cardSelected: { borderColor: colors.gold, borderWidth: 2 },
  cardTitle: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 18 },
  cardTitleSelected: { color: colors.goldLight },
  line: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 13 },
  link: { color: colors.goldLight, fontSize: 14, textDecorationLine: 'underline' },
  button: { marginHorizontal: spacing.lg },
});
