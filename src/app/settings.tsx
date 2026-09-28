import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Difficulty, InputMode } from '../game';
import { useGame } from '../state/GameProvider';
import { GoldButton } from '../ui/components/GoldButton';
import { Panel } from '../ui/components/Panel';
import { colors, fonts, radius, spacing } from '../ui/theme';

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
              {selected ? '◉ ' : '○ '}
              {o.label}
            </Text>
            <Text style={styles.muted}>{o.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const INPUT_MODES: { value: InputMode; label: string; description: string }[] = [
  {
    value: 'camera',
    label: 'Camera',
    description: 'Your phone watches your movements and counts reps automatically. Analysed on the phone only.',
  },
  {
    value: 'manual',
    label: 'Manual (no camera)',
    description: 'Tap the Rep button yourself. You choose how many reps each press adds.',
  },
];

const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Simplified exercises: wall and knee push-ups, chair squats…' },
  { value: 'normal', label: 'Normal', description: 'Classic exercises: push-ups, squats, lunges, plank…' },
  { value: 'advanced', label: 'Advanced', description: 'Normal exercises plus hard ones: pull-ups, dips, pistol squats…' },
];

export default function SettingsScreen() {
  const { settings, updateSettings, resetProgress } = useGame();

  const confirmReset = () => {
    Alert.alert(
      'Reset all progress?',
      'Muscle levels, gold, swords, defeated enemies and your whole training history will be erased for good.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: () => {
            resetProgress().then(
              () => Alert.alert('Progress reset', 'A new adventure begins.'),
              () => Alert.alert('Error', 'The reset failed.'),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Panel title="Rep counting">
          <Choice options={INPUT_MODES} value={settings.inputMode} onChange={(inputMode) => updateSettings({ inputMode })} />
        </Panel>

        <Panel title="Difficulty">
          <Choice options={DIFFICULTIES} value={settings.difficulty} onChange={(difficulty) => updateSettings({ difficulty })} />
        </Panel>

        <Panel title="Privacy & security">
          <Text style={styles.text}>• Everything stays on this phone: no account, no server, no ads, no tracking.</Text>
          <Text style={styles.text}>
            • Camera: the video is analysed live on your phone to find the position of your joints. It is never recorded,
            saved or sent. Only rep counts are kept.
          </Text>
          <Text style={styles.text}>
            • The only internet use is downloading the body-tracking library (Google MediaPipe) the first time camera mode
            starts. Nothing is uploaded.
          </Text>
          <Text style={styles.text}>• The camera is switched off as soon as you leave the Fight tab.</Text>
          <Text style={styles.text}>• Prefer not to film yourself? Choose Manual mode above.</Text>
        </Panel>

        <Panel title="Progress">
          <Text style={styles.text}>Erases muscle levels, gold, swords, defeated enemies and the calendar. This cannot be undone.</Text>
          <GoldButton label="Reset progress" variant="danger" onPress={confirmReset} />
        </Panel>

        <Panel title="About">
          <Text style={styles.text}>
            Cali-Incr turns bodyweight training into a fight: every rep is a sword strike. Your muscles gain XP, and each
            hit deals the sum of their levels. Beat 10 monsters, then the boss, to reach the next level.
          </Text>
          <Text style={styles.text}>
            Balance your training and respect rest days: a rested muscle earns up to ×1.5 XP, a muscle trained several days
            in a row earns less.
          </Text>
          <Text style={styles.muted}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 26 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 12 },
  choices: { gap: spacing.sm },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    backgroundColor: colors.stoneLight,
  },
  choiceSelected: { borderColor: colors.gold },
  choiceLabel: { color: colors.text, fontFamily: fonts.title, fontSize: 15 },
  choiceLabelSelected: { color: colors.goldLight },
});
