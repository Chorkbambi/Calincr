import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  currentMultiplier,
  enemyName,
  exercisesForMuscle,
  hitDamage,
  MUSCLE_IDS,
  MUSCLE_NAMES,
  recoveryStatus,
  toDayKey,
  totalLevels,
  WEAPONS,
  xpForNextLevel,
  zoneForLevel,
  type ExerciseId,
  type Kill,
  type MuscleId,
  type RecoveryStatus,
} from '../game';
import { useGame } from '../state/GameProvider';
import { BodyMap } from '../ui/components/BodyMap';
import { ExerciseGuideModal } from '../ui/components/ExerciseGuideModal';
import { Panel } from '../ui/components/Panel';
import { ProgressBar } from '../ui/components/ProgressBar';
import { SwordFigure } from '../ui/components/SwordFigure';
import { formatDate, formatMultiplier, formatNumber, STATUS_LABELS } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';

const STATUS_COLORS: Record<RecoveryStatus, string> = {
  tired: colors.tired,
  ready: colors.ready,
  rested: colors.rested,
};

export default function CharacterScreen() {
  const { state, settings, repository, dataVersion } = useGame();
  const [bossKills, setBossKills] = useState<Kill[]>([]);
  const [killCount, setKillCount] = useState(0);
  const [selected, setSelected] = useState<MuscleId>('chest');
  const [guideFor, setGuideFor] = useState<ExerciseId | null>(null);
  const today = toDayKey(new Date());
  const weaponIndex = Math.max(0, WEAPONS.findIndex((w) => w.id === state.weaponId));
  const weapon = WEAPONS[weaponIndex] ?? WEAPONS[0];

  useEffect(() => {
    repository.listBossKills().then(setBossKills);
    repository.countKills().then(setKillCount);
  }, [repository, dataVersion]);

  const levels = Object.fromEntries(MUSCLE_IDS.map((m) => [m, state.muscles[m].level])) as Record<MuscleId, number>;
  const muscle = state.muscles[selected];
  const multiplier = currentMultiplier(muscle, today);
  const status = recoveryStatus(multiplier);
  const suggestions = exercisesForMuscle(selected, settings.difficulty);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel style={styles.hero}>
          <SwordFigure size={130} tier={weaponIndex} />
          <View style={styles.heroText}>
            <Text style={styles.weapon}>{weapon.name}</Text>
            <Text style={styles.muted}>Weapon {formatMultiplier(weapon.damageMultiplier)}</Text>
            <Text style={styles.damage}>{formatNumber(hitDamage(state))}</Text>
            <Text style={styles.muted}>damage per hit</Text>
            <Text style={styles.formula}>
              {totalLevels(state)} muscle levels × {formatMultiplier(weapon.damageMultiplier)}
            </Text>
          </View>
        </Panel>

        <Panel title="Your body">
          <BodyMap levels={levels} selected={selected} onSelect={setSelected} />
          <Text style={styles.hint}>Tap a muscle to see how to train it.</Text>
        </Panel>

        <Panel title={`${MUSCLE_NAMES[selected]} — level ${muscle.level}`}>
          <ProgressBar progress={muscle.xp / xpForNextLevel(muscle.level)} />
          <View style={styles.row}>
            <Text style={styles.xp}>
              {formatNumber(Math.floor(muscle.xp))} / {formatNumber(xpForNextLevel(muscle.level))} XP
            </Text>
            <Text style={[styles.status, { color: STATUS_COLORS[status] }]}>
              {STATUS_LABELS[status]} · XP {formatMultiplier(multiplier)}
            </Text>
          </View>
          <Text style={styles.subtitle}>Recommended exercises</Text>
          {suggestions.length === 0 ? (
            <Text style={styles.muted}>No exercise for this muscle in your difficulty mode.</Text>
          ) : (
            suggestions.map(({ exercise, weight }) => (
              <View key={exercise.id} style={styles.suggestion}>
                <Pressable
                  style={styles.suggestionMain}
                  accessibilityRole="button"
                  onPress={() => router.navigate({ pathname: '/', params: { exercise: exercise.id } })}
                >
                  <Text style={styles.suggestionName}>{exercise.name}</Text>
                  <Text style={styles.muted}>
                    {Math.round(weight * 100)}% of its XP · train now ›
                  </Text>
                </Pressable>
                <Pressable onPress={() => setGuideFor(exercise.id as ExerciseId)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.howTo}>ⓘ</Text>
                </Pressable>
              </View>
            ))
          )}
        </Panel>

        <Panel title="All muscles">
          {MUSCLE_IDS.map((id) => {
            const m = state.muscles[id];
            const cost = xpForNextLevel(m.level);
            const mult = currentMultiplier(m, today);
            const s = recoveryStatus(mult);
            return (
              <Pressable key={id} style={styles.muscle} onPress={() => setSelected(id)}>
                <View style={styles.row}>
                  <Text style={[styles.muscleName, id === selected && styles.selectedName]}>{MUSCLE_NAMES[id]}</Text>
                  <Text style={styles.level}>Lv. {m.level}</Text>
                </View>
                <ProgressBar progress={m.xp / cost} />
                <View style={styles.row}>
                  <Text style={styles.xp}>
                    {formatNumber(Math.floor(m.xp))} / {formatNumber(cost)} XP
                  </Text>
                  <Text style={[styles.status, { color: STATUS_COLORS[s] }]}>
                    {STATUS_LABELS[s]} · XP {formatMultiplier(mult)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.hint}>
            The XP multiplier is set by each muscle’s first session of the day. 2 days of rest: ×1, 3 days: ×1.25, 4+ days:
            ×1.5. Training the same muscle several days in a row tires it out.
          </Text>
        </Panel>

        <Panel title={`Hall of fame · ${formatNumber(killCount)} enemies slain`}>
          {bossKills.length === 0 ? (
            <Text style={styles.muted}>No boss defeated yet.</Text>
          ) : (
            bossKills.map((kill, i) => (
              <View key={`${kill.level}-${i}`} style={styles.row}>
                <Text style={styles.bossName}>
                  Lv. {kill.level} · {enemyName(kill.level, kill.stage)}
                </Text>
                <Text style={styles.xp}>
                  {zoneForLevel(kill.level).name} · {formatDate(kill.defeatedAt)}
                </Text>
              </View>
            ))
          )}
        </Panel>
      </ScrollView>
      <ExerciseGuideModal exerciseId={guideFor} onClose={() => setGuideFor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1, gap: 2 },
  weapon: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 18 },
  damage: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 40, marginTop: spacing.sm },
  formula: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  muted: { color: colors.textMuted, fontSize: 13 },
  subtitle: { color: colors.gold, fontFamily: fonts.title, fontSize: 14, marginTop: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.stoneLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  suggestionMain: { flex: 1 },
  suggestionName: { color: colors.parchment, fontSize: 15, fontWeight: '600' },
  howTo: { color: colors.goldLight, fontSize: 20, paddingHorizontal: spacing.sm },
  muscle: { gap: 4, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  muscleName: { color: colors.parchment, fontFamily: fonts.title, fontSize: 15 },
  selectedName: { color: colors.goldLight },
  level: { color: colors.gold, fontFamily: fonts.titleBold, fontSize: 15 },
  xp: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  status: { fontSize: 12, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: spacing.sm },
  bossName: { color: colors.text, fontSize: 14, flexShrink: 1 },
});
