import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExerciseUnit } from '../game';
import { GoldButton } from '../ui/components/GoldButton';
import { colors, fonts, radius, spacing } from '../ui/theme';
import type { ManualRepSource } from './ManualRepSource';

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** On-screen controls feeding a ManualRepSource. */
export function ManualRepControls({ source, unit }: { source: ManualRepSource; unit: ExerciseUnit }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [typing, setTyping] = useState(false);
  const [count, setCount] = useState('');

  useEffect(
    () =>
      source.onTimer((seconds, isRunning) => {
        setElapsed(seconds);
        setRunning(isRunning);
      }),
    [source],
  );

  // Switching exercise stops a running stopwatch.
  useEffect(() => {
    source.stopTimer();
    setElapsed(0);
    setTyping(false);
  }, [source, unit]);

  if (unit === 'seconds') {
    return (
      <View style={styles.box}>
        <Text style={styles.timer} accessibilityLabel={`Chronomètre ${elapsed} secondes`}>
          {clock(elapsed)}
        </Text>
        <GoldButton
          big
          label={running ? 'Arrêter' : 'Démarrer'}
          variant={running ? 'danger' : 'gold'}
          onPress={() => (running ? source.stopTimer() : source.startTimer())}
        />
      </View>
    );
  }

  const submit = () => {
    const n = parseInt(count, 10);
    if (Number.isFinite(n) && n > 0) source.addReps(Math.min(n, 999));
    setCount('');
    setTyping(false);
  };

  return (
    <View style={styles.box}>
      <GoldButton big label="Répétition" onPress={() => source.tapRep()} />
      {typing ? (
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={count}
            onChangeText={(t) => setCount(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="Nombre de rép."
            placeholderTextColor={colors.textMuted}
            autoFocus
            maxLength={3}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <GoldButton label="Valider" onPress={submit} />
          <GoldButton label="✕" variant="stone" onPress={() => setTyping(false)} />
        </View>
      ) : (
        <GoldButton label="Ajouter un nombre" variant="stone" onPress={() => setTyping(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.parchment,
    color: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontFamily: fonts.body,
  },
  timer: {
    color: colors.goldLight,
    fontFamily: fonts.titleBold,
    fontSize: 48,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
