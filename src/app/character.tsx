import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  bossName,
  currentMultiplier,
  hitDamage,
  MUSCLE_IDS,
  MUSCLE_NAMES,
  recoveryStatus,
  toDayKey,
  totalLevels,
  WEAPONS,
  xpForNextLevel,
  type DefeatedBoss,
  type RecoveryStatus,
} from '../game';
import { useGame } from '../state/GameProvider';
import { Panel } from '../ui/components/Panel';
import { ProgressBar } from '../ui/components/ProgressBar';
import { SwordFigure } from '../ui/components/SwordFigure';
import { formatDate, formatMultiplier, formatNumber, STATUS_LABELS } from '../ui/format';
import { colors, fonts, spacing } from '../ui/theme';

const STATUS_COLORS: Record<RecoveryStatus, string> = {
  tired: colors.tired,
  ready: colors.ready,
  rested: colors.rested,
};

export default function CharacterScreen() {
  const { state, repository, dataVersion } = useGame();
  const [defeated, setDefeated] = useState<DefeatedBoss[]>([]);
  const today = toDayKey(new Date());
  const weapon = WEAPONS[state.weaponId];

  useEffect(() => {
    repository.listDefeatedBosses().then(setDefeated);
  }, [repository, dataVersion]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel style={styles.hero}>
          <SwordFigure size={140} />
          <View style={styles.heroText}>
            <Text style={styles.weapon}>{weapon.name}</Text>
            <Text style={styles.muted}>Multiplicateur {formatMultiplier(weapon.damageMultiplier)}</Text>
            <Text style={styles.damage}>{formatNumber(hitDamage(state))}</Text>
            <Text style={styles.muted}>dégâts par coup</Text>
            <Text style={styles.formula}>
              {totalLevels(state)} niveaux × {formatMultiplier(weapon.damageMultiplier)}
            </Text>
          </View>
        </Panel>

        <Panel title="Muscles">
          {MUSCLE_IDS.map((id) => {
            const muscle = state.muscles[id];
            const cost = xpForNextLevel(muscle.level);
            const multiplier = currentMultiplier(muscle, today);
            const status = recoveryStatus(multiplier);
            return (
              <View key={id} style={styles.muscle}>
                <View style={styles.muscleRow}>
                  <Text style={styles.muscleName}>{MUSCLE_NAMES[id]}</Text>
                  <Text style={styles.level}>Niv. {muscle.level}</Text>
                </View>
                <ProgressBar progress={muscle.xp / cost} />
                <View style={styles.muscleRow}>
                  <Text style={styles.xp}>
                    {formatNumber(Math.floor(muscle.xp))} / {formatNumber(cost)} XP
                  </Text>
                  <Text style={[styles.status, { color: STATUS_COLORS[status] }]}>
                    {STATUS_LABELS[status]} · XP {formatMultiplier(multiplier)}
                  </Text>
                </View>
              </View>
            );
          })}
          <Text style={styles.hint}>
            Le multiplicateur est fixé à la première séance du jour pour chaque muscle. Repos de 2 jours : ×1, 3 jours :
            ×1,25, 4 jours et plus : ×1,5. Enchaîner les jours fatigue le muscle.
          </Text>
        </Panel>

        <Panel title={`Tableau de chasse (${defeated.length})`}>
          {defeated.length === 0 ? (
            <Text style={styles.muted}>Aucun boss vaincu pour l’instant.</Text>
          ) : (
            defeated.map((boss) => (
              <View key={boss.index} style={styles.muscleRow}>
                <Text style={styles.bossName}>
                  {boss.index + 1}. {bossName(boss.index)}
                </Text>
                <Text style={styles.xp}>
                  {formatNumber(boss.maxHp)} PV · {formatDate(boss.defeatedAt)}
                </Text>
              </View>
            ))
          )}
        </Panel>
      </ScrollView>
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
  formula: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: spacing.xs },
  muted: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  muscle: { gap: 4, paddingVertical: spacing.xs },
  muscleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  muscleName: { color: colors.parchment, fontFamily: fonts.title, fontSize: 15 },
  level: { color: colors.gold, fontFamily: fonts.titleBold, fontSize: 15 },
  xp: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontVariant: ['tabular-nums'] },
  status: { fontFamily: fonts.body, fontSize: 12, fontWeight: '600' },
  hint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, fontStyle: 'italic', marginTop: spacing.sm },
  bossName: { color: colors.text, fontFamily: fonts.body, fontSize: 14, flexShrink: 1 },
});
