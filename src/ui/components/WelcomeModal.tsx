import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ONBOARDING_VERSION, REST_TIMER_CHOICES, type Difficulty, type InputMode } from '../../game';
import { useGame } from '../../state/GameProvider';
import { DIFFICULTY_CHOICES } from '../difficulty';
import { restTimerLabel } from '../format';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

const TUTORIAL: { icon: string; title: string; lines: string[] }[] = [
  {
    icon: '⚔️',
    title: 'Every rep is a strike',
    lines: [
      'Pick an exercise and train for real: each rep hits the monster in front of you.',
      'Your muscles gain XP and level up. Each hit deals the sum of your muscle levels.',
      'Beat 10 monsters, then the boss, to reach the next level. Keep hitting fast for a combo bonus.',
    ],
  },
  {
    icon: '🛌',
    title: 'Rest is rewarded',
    lines: [
      'A muscle trained several days in a row earns less XP (Tired).',
      'A muscle rested for a few days earns up to ×1.5 XP (Rested).',
      'Tap a muscle on the Hero screen to see which exercises train it.',
    ],
  },
  {
    icon: '📜',
    title: 'Your daily quest',
    lines: [
      'Each day the app suggests one exercise, with a goal based on your last session.',
      'Pick your sets and reps before an exercise: each set ends by itself and the rest timer starts, phone on the floor.',
      'Complete the quest for bonus XP and gold. Set a weekly goal (e.g. 3 days) and keep your streak of weeks going.',
      'Spend gold in the Shop on better swords. Unlock achievements for extra gold.',
    ],
  },
];

const OPTIONS: { mode: InputMode; title: string; lines: string[] }[] = [
  {
    mode: 'camera',
    title: '📷 Camera',
    lines: [
      'Your phone counts your reps by watching your movements. You check the counts at the end.',
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

/** First launch (or new onboarding version): short tutorial, then rep counting and rest timer choices. */
export function WelcomeModal() {
  const { settings, updateSettings } = useGame();
  const visible = settings.onboardingVersion < ONBOARDING_VERSION;
  const returning = settings.onboardingVersion > 0;
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<InputMode | null>(returning ? settings.inputMode : null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(returning ? settings.difficulty : null);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    if (returning) setChoice(settings.inputMode);
  }, [returning, settings.inputMode]);
  useEffect(() => {
    if (returning) setDifficulty(settings.difficulty);
  }, [returning, settings.difficulty]);

  const last = TUTORIAL.length;
  const ready = choice !== null && restTimer !== null && difficulty !== null;
  const finish = () => {
    if (choice === null || restTimer === null || difficulty === null) return;
    updateSettings({ inputMode: choice, restTimerSeconds: restTimer, difficulty, onboardingVersion: ONBOARDING_VERSION });
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.screen}>
        <View style={styles.dots}>
          {[...TUTORIAL, null].map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 0 && <Text style={styles.title}>Welcome to Calincr</Text>}
          {step < last ? (
            <>
              <Text style={styles.icon}>{TUTORIAL[step].icon}</Text>
              <Text style={styles.heading}>{TUTORIAL[step].title}</Text>
              {TUTORIAL[step].lines.map((line) => (
                <Text key={line} style={styles.text}>
                  {line}
                </Text>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.heading}>What is your level?</Text>
              <Text style={styles.line}>It sets which exercises are offered. Every level trains all your muscles.</Text>
              {DIFFICULTY_CHOICES.map((d) => {
                const selected = difficulty === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => setDifficulty(d.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.card, selected && styles.cardSelected]}
                  >
                    <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                      {selected ? '◉ ' : '○ '}
                      {d.label}
                    </Text>
                    <Text style={styles.line}>{d.description}</Text>
                  </Pressable>
                );
              })}
              <Text style={styles.heading}>How do you want your reps to be counted?</Text>
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
              <Text style={styles.heading}>Would you like a rest timer between sets?</Text>
              <Text style={styles.line}>
                Before an exercise you pick its sets and reps. When a set is done, a countdown starts by itself and tells
                you when to begin the next one.
              </Text>
              <View style={styles.timerRow}>
                {REST_TIMER_CHOICES.map((s) => {
                  const selected = restTimer === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setRestTimer(s)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[styles.chip, selected && styles.cardSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.cardTitleSelected]}>{restTimerLabel(s)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.muted}>You can change all of this at any time in Settings.</Text>
              <Pressable onPress={() => setPolicyOpen(true)} accessibilityRole="link">
                <Text style={styles.link}>Read the privacy policy</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
        <View style={styles.buttons}>
          {step > 0 && <GoldButton label="Back" variant="stone" style={styles.flex} onPress={() => setStep(step - 1)} />}
          {step < last ? (
            <GoldButton big label="Next" style={styles.flex} onPress={() => setStep(step + 1)} />
          ) : (
            <GoldButton
              big
              label="Let’s fight"
              style={styles.flex}
              disabled={!ready}
              onPress={finish}
            />
          )}
        </View>
      </View>
      <PrivacyPolicyModal visible={policyOpen} onClose={() => setPolicyOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingBottom: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.gold },
  title: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 28 },
  icon: { fontSize: 56, textAlign: 'center' },
  heading: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 20 },
  text: { color: colors.text, fontSize: 17, lineHeight: 24 },
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
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stone,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 13 },
  link: { color: colors.goldLight, fontSize: 14, textDecorationLine: 'underline' },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  flex: { flex: 1 },
});
