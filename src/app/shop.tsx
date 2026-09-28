import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { totalLevels, WEAPONS, type ShopError, type WeaponId } from '../game';
import { useGame } from '../state/GameProvider';
import { GoldButton } from '../ui/components/GoldButton';
import { Panel } from '../ui/components/Panel';
import { SwordFigure } from '../ui/components/SwordFigure';
import { formatCompact, formatMultiplier, formatNumber } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';

const ERRORS: Record<ShopError, string> = {
  not_enough_gold: 'Not enough gold yet. Defeat more monsters!',
  already_owned: 'You already own this sword.',
  not_owned: 'Buy this sword first.',
  unknown_weapon: 'Unknown sword.',
};

export default function ShopScreen() {
  const { state, buy, equip, pendingAchievements, clearPendingAchievements } = useGame();
  const [notice, setNotice] = useState<string | null>(null);
  const [trophy, setTrophy] = useState<string | null>(null);

  // Achievements unlocked by a purchase (e.g. "Armorer") are announced here, once.
  useEffect(() => {
    if (pendingAchievements.length === 0) return;
    setTrophy(pendingAchievements.map((a) => `🏆 ${a.name} (+${formatNumber(a.gold)} gold)`).join('\n'));
    clearPendingAchievements();
  }, [pendingAchievements, clearPendingAchievements]);
  const levels = totalLevels(state);

  const act = (result: ShopError | null, success: string) => setNotice(result ? ERRORS[result] : success);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Blacksmith</Text>
          <Text style={styles.gold}>🪙 {formatNumber(state.gold)}</Text>
        </View>
        <Text style={styles.muted}>Every monster drops gold. Bosses drop much more. Better swords multiply your damage.</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {trophy ? <Text style={styles.notice}>{trophy}</Text> : null}

        {WEAPONS.map((weapon, index) => {
          const owned = state.ownedWeapons.includes(weapon.id as WeaponId);
          const equipped = state.weaponId === weapon.id;
          const affordable = state.gold >= weapon.price;
          return (
            <Panel key={weapon.id} style={[styles.item, equipped && styles.equipped]}>
              <SwordFigure size={96} tier={index} />
              <View style={styles.info}>
                <Text style={styles.name}>{weapon.name}</Text>
                <Text style={styles.stat}>Damage {formatMultiplier(weapon.damageMultiplier)}</Text>
                <Text style={styles.muted}>= {formatNumber(Math.round(levels * weapon.damageMultiplier))} per hit now</Text>
                {equipped ? (
                  <Text style={styles.equippedText}>Equipped</Text>
                ) : owned ? (
                  <GoldButton
                    label="Equip"
                    variant="stone"
                    onPress={() => act(equip(weapon.id as WeaponId), `${weapon.name} equipped.`)}
                  />
                ) : (
                  <GoldButton
                    label={`Buy · ${formatCompact(weapon.price)} gold`}
                    disabled={!affordable}
                    onPress={() => act(buy(weapon.id as WeaponId), `${weapon.name} bought and equipped!`)}
                  />
                )}
              </View>
            </Panel>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 26 },
  gold: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 20 },
  muted: { color: colors.textMuted, fontSize: 13 },
  notice: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  equipped: { borderColor: colors.gold, borderWidth: 2, borderRadius: radius.md },
  info: { flex: 1, gap: 4 },
  name: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 17 },
  stat: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  equippedText: { color: colors.rested, fontFamily: fonts.titleBold, fontSize: 14, marginTop: spacing.xs },
});
