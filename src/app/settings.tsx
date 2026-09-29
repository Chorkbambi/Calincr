import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { REST_TIMER_CHOICES, type Difficulty, type InputMode } from '../game';
import { loadSupportPrice, purchaseSupport, SUPPORT_FALLBACK_PRICE } from '../support/supportPurchase';
import { cancelDailyReminder, scheduleDailyReminder } from '../notifications/reminders';
import { useGame } from '../state/GameProvider';
import { formatClock, restTimerLabel } from '../ui/format';
import { BackupPanel } from '../ui/components/BackupPanel';
import { GoldButton } from '../ui/components/GoldButton';
import { Panel } from '../ui/components/Panel';
import { LicensesModal } from '../ui/components/LicensesModal';
import { PrivacyPolicyModal } from '../ui/components/PrivacyPolicyModal';
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

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={styles.muted}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.gold, false: colors.border }}
        thumbColor={colors.parchment}
      />
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.text}>{label}</Text>
      <View style={styles.stepperButtons}>
        <Pressable onPress={onMinus} style={styles.stepButton} accessibilityRole="button" accessibilityLabel={`${label} earlier`}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={onPlus} style={styles.stepButton} accessibilityRole="button" accessibilityLabel={`${label} later`}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const INPUT_MODES: { value: InputMode; label: string; description: string }[] = [
  {
    value: 'camera',
    label: 'Camera',
    description:
      'Your phone watches your movements and counts reps automatically (you can still add missed reps by hand). Analysed on the phone only, works offline.',
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
  const [policyOpen, setPolicyOpen] = useState(false);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [supportPrice, setSupportPrice] = useState(SUPPORT_FALLBACK_PRICE);
  useEffect(() => {
    let cancelled = false;
    loadSupportPrice().then((price) => {
      if (price && !cancelled) setSupportPrice(price);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { reminder } = settings;

  const setReminder = async (next: { enabled: boolean; hour: number; minute: number }) => {
    updateSettings({ reminder: next });
    if (!next.enabled) {
      await cancelDailyReminder();
      return;
    }
    const result = await scheduleDailyReminder(next.hour, next.minute);
    if (result === 'scheduled') return;
    updateSettings({ reminder: { ...next, enabled: false } });
    Alert.alert(
      'Reminder not set',
      result === 'denied'
        ? 'Notifications are not allowed for this app. You can allow them in your phone settings.'
        : 'Reminders are not available on this phone.',
    );
  };

  const shiftTime = (minutes: number) => {
    const total = (((reminder.hour * 60 + reminder.minute + minutes) % 1440) + 1440) % 1440;
    void setReminder({ ...reminder, hour: Math.floor(total / 60), minute: total % 60 });
  };

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

        <Panel title="Rest timer">
          <Text style={styles.muted}>Countdown shown after “Finish set”.</Text>
          <View style={styles.chips}>
            {REST_TIMER_CHOICES.map((s) => {
              const selected = settings.restTimerSeconds === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => updateSettings({ restTimerSeconds: s })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.choiceSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.choiceLabelSelected]}>{restTimerLabel(s)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Panel>

        <Panel title="Daily reminder">
          <Toggle
            label="Remind me to train"
            description="A notification scheduled on this phone once a day. Nothing is sent to a server."
            value={reminder.enabled}
            onChange={(enabled) => void setReminder({ ...reminder, enabled })}
          />
          {reminder.enabled && (
            <Stepper
              label="Time"
              value={formatClock(reminder.hour, reminder.minute)}
              onMinus={() => shiftTime(-30)}
              onPlus={() => shiftTime(30)}
            />
          )}
        </Panel>

        <Panel title="Accessibility">
          <Toggle
            label="Large buttons"
            description="Bigger Rep, correction and Finish set buttons during the fight."
            value={settings.largeButtons}
            onChange={(largeButtons) => updateSettings({ largeButtons })}
          />
          <Text style={styles.muted}>Text follows your phone’s font size setting.</Text>
        </Panel>

        <Panel title="Privacy & security">
          <Text style={styles.text}>• Everything stays on this phone: no account, no server, no ads, no tracking.</Text>
          <Text style={styles.text}>
            • Camera: the video is analysed live on your phone to find the position of your joints. It is never recorded,
            saved or sent. Only rep counts are kept.
          </Text>
          <Text style={styles.text}>
            • The body-tracking engine (Google MediaPipe) is built into the app: camera mode works offline and the app
            never uses the internet.
          </Text>
          <Text style={styles.text}>• The camera is switched off as soon as you leave the Fight tab.</Text>
          <Text style={styles.text}>• Prefer not to film yourself? Choose Manual mode above.</Text>
          <Text style={styles.text}>• In camera mode, the “Image” button hides your picture and shows only a stick figure.</Text>
          <Text style={styles.text}>• The app never uses the microphone.</Text>
          <Text style={styles.text}>
            • Daily reminders are scheduled by your phone itself. Backups and shared pictures go only where you choose.
          </Text>
          <GoldButton label="Read the privacy policy" variant="stone" onPress={() => setPolicyOpen(true)} />
        </Panel>

        <BackupPanel />

        <Panel title="Progress">
          <Text style={styles.text}>Erases muscle levels, gold, swords, defeated enemies and the calendar. This cannot be undone.</Text>
          <GoldButton label="Reset progress" variant="danger" onPress={confirmReset} />
        </Panel>

        <Panel title="About">
          <Text style={styles.text}>
            Calincr turns bodyweight training into a fight: every rep is a sword strike. Your muscles gain XP, and each
            hit deals the sum of their levels. Beat 10 monsters, then the boss, to reach the next level.
          </Text>
          <Text style={styles.text}>
            Balance your training and respect rest days: a rested muscle earns up to ×1.5 XP, a muscle trained several days
            in a row earns less.
          </Text>
          <Text style={styles.muted}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <GoldButton label="Open-source licenses" variant="stone" onPress={() => setLicensesOpen(true)} />
        </Panel>

        <Panel title="Support">
          <GoldButton label={`Pay ${supportPrice}`} onPress={() => confirmSupport(supportPrice)} />
        </Panel>
      </ScrollView>
      <PrivacyPolicyModal visible={policyOpen} onClose={() => setPolicyOpen(false)} />
      <LicensesModal visible={licensesOpen} onClose={() => setLicensesOpen(false)} />
    </SafeAreaView>
  );
}

const SUPPORT_MESSAGE = 'This button does nothing, it’s just here so you can support me if you like the game.';

/** Voluntary tip through the App Store / Google Play: shows the message, then pays. Unlocks nothing. */
function confirmSupport(price: string) {
  Alert.alert(`Pay ${price}`, SUPPORT_MESSAGE, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: `Pay ${price}`,
      onPress: () => {
        purchaseSupport()
          .then((result) => {
            if (result === 'paid') Alert.alert('Thank you!', 'Your support means a lot. ❤️');
            else if (result === 'pending') Alert.alert('Payment pending', 'The store will finish the payment later. Thank you!');
            else if (result === 'unavailable')
              Alert.alert('Not available', 'Payment is only available in the version installed from the App Store or Google Play. Nothing was charged.');
            else if (result === 'failed') Alert.alert('Payment failed', 'Nothing was charged.');
          })
          .catch(() => Alert.alert('Payment failed', 'Nothing was charged.'));
      },
    },
  ]);
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
  flex: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.stoneLight,
  },
  chipText: { color: colors.text, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.goldLight, fontSize: 22 },
  stepValue: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 20, minWidth: 64, textAlign: 'center' },
});
