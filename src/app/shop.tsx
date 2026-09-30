import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  buyCosmetic,
  buyGear,
  buyStreakFreeze,
  COSMETICS,
  equipCosmetic,
  equipGear,
  GEAR,
  STREAK_FREEZE,
  streakFreezePrice,
  totalLevels,
  WEAPONS,
  type CosmeticId,
  type GearId,
  type ShopError,
  type WeaponId,
} from '../game';
import { useGame } from '../state/GameProvider';
import { GoldButton } from '../ui/components/GoldButton';
import { Panel } from '../ui/components/Panel';
import { SwordFigure } from '../ui/components/SwordFigure';
import { formatCompact, formatMultiplier, formatNumber } from '../ui/format';
import { colors, fonts, radius, spacing } from '../ui/theme';

const ERRORS: Record<ShopError, string> = {
  not_enough_gold: 'Not enough gold yet. Defeat more monsters!',
  already_owned: 'You already own this.',
  not_owned: 'Buy this first.',
  unknown_weapon: 'Unknown sword.',
  unknown_item: 'Unknown item.',
  max_owned: `You can hold ${STREAK_FREEZE.maxOwned} streak freezes at most.`,
};

type Tab = 'swords' | 'gear' | 'style' | 'items';
const TABS: { id: Tab; label: string }[] = [
  { id: 'swords', label: '⚔️ Swords' },
  { id: 'gear', label: '🛡️ Gear' },
  { id: 'style', label: '✨ Style' },
  { id: 'items', label: '🧊 Items' },
];

export default function ShopScreen() {
  const { state, buy, equip, transact, pendingAchievements, clearPendingAchievements } = useGame();
  const [tab, setTab] = useState<Tab>('swords');
  const [notice, setNotice] = useState<string | null>(null);
  const [trophy, setTrophy] = useState<string | null>(null);
  const levels = totalLevels(state);
  const weaponTier = Math.max(0, WEAPONS.findIndex((w) => w.id === state.weaponId));
  const glow = COSMETICS.find((c) => c.id === state.equippedCosmetics.glow)?.color;

  // Achievements unlocked by a purchase (e.g. "Armorer") are announced here, once.
  useEffect(() => {
    if (pendingAchievements.length === 0) return;
    setTrophy(pendingAchievements.map((a) => `🏆 ${a.name} (+${formatNumber(a.gold)} gold)`).join('\n'));
    clearPendingAchievements();
  }, [pendingAchievements, clearPendingAchievements]);

  const act = (result: ShopError | null, success: string) => setNotice(result ? ERRORS[result] : success);

  const buyButton = (price: number, onPress: () => void) => (
    <GoldButton label={`Buy · ${formatCompact(price)} gold`} disabled={state.gold < price} onPress={onPress} />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Blacksmith</Text>
          <Text style={styles.gold}>🪙 {formatNumber(state.gold)}</Text>
        </View>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setTab(t.id);
                setNotice(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.id }}
              style={[styles.tab, tab === t.id && styles.tabSelected]}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextSelected]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {trophy ? <Text style={styles.notice}>{trophy}</Text> : null}

        {tab === 'swords' && (
          <>
            <Text style={styles.muted}>Every monster drops gold. Bosses drop much more. Better swords multiply your damage.</Text>
            {WEAPONS.map((weapon, index) => {
              const owned = state.ownedWeapons.includes(weapon.id as WeaponId);
              const equipped = state.weaponId === weapon.id;
              return (
                <Panel key={weapon.id} style={[styles.item, equipped && styles.equipped]}>
                  <SwordFigure size={96} tier={index} glow={equipped ? glow : undefined} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{weapon.name}</Text>
                    <Text style={styles.stat}>Damage {formatMultiplier(weapon.damageMultiplier)}</Text>
                    <Text style={styles.muted}>= {formatNumber(Math.round(levels * weapon.damageMultiplier))} per hit now</Text>
                    {equipped ? (
                      <Text style={styles.equippedText}>Equipped</Text>
                    ) : owned ? (
                      <GoldButton label="Equip" variant="stone" onPress={() => act(equip(weapon.id as WeaponId), `${weapon.name} equipped.`)} />
                    ) : (
                      buyButton(weapon.price, () => act(buy(weapon.id as WeaponId), `${weapon.name} bought and equipped!`))
                    )}
                  </View>
                </Panel>
              );
            })}
          </>
        )}

        {tab === 'gear' && (
          <>
            <Text style={styles.muted}>Wear one armor and one ring. Armor brings more gold, rings boost your combos and weakness hits.</Text>
            {GEAR.map((gear) => {
              const id = gear.id as GearId;
              const owned = state.ownedGear.includes(id);
              const worn = state.equippedGear[gear.slot] === id;
              return (
                <Panel key={id} style={[styles.row, worn && styles.equipped]}>
                  <Text style={styles.icon}>{gear.slot === 'armor' ? '🛡️' : '💍'}</Text>
                  <View style={styles.info}>
                    <Text style={styles.name}>{gear.name}</Text>
                    <Text style={styles.stat}>{gear.description}</Text>
                    {worn ? (
                      <GoldButton label="Take off" variant="stone" onPress={() => act(transact((s) => equipGear(s, gear.slot, null)), `${gear.name} taken off.`)} />
                    ) : owned ? (
                      <GoldButton label="Wear" variant="stone" onPress={() => act(transact((s) => equipGear(s, gear.slot, id)), `${gear.name} worn.`)} />
                    ) : (
                      buyButton(gear.price, () => act(transact((s) => buyGear(s, id)), `${gear.name} bought and worn!`))
                    )}
                  </View>
                </Panel>
              );
            })}
          </>
        )}

        {tab === 'style' && (
          <>
            <Text style={styles.muted}>Just for looks: a glow around your sword and the colour of your damage numbers.</Text>
            {COSMETICS.map((c) => {
              const id = c.id as CosmeticId;
              const owned = state.ownedCosmetics.includes(id);
              const used = state.equippedCosmetics[c.slot] === id;
              return (
                <Panel key={id} style={[styles.row, used && styles.equipped]}>
                  {c.slot === 'glow' ? (
                    <SwordFigure size={72} tier={weaponTier} glow={c.color} />
                  ) : (
                    <Text style={[styles.sample, { color: c.color }]}>-128</Text>
                  )}
                  <View style={styles.info}>
                    <Text style={styles.name}>{c.name}</Text>
                    {used ? (
                      <GoldButton label="Remove" variant="stone" onPress={() => act(transact((s) => equipCosmetic(s, c.slot, null)), `${c.name} removed.`)} />
                    ) : owned ? (
                      <GoldButton label="Use" variant="stone" onPress={() => act(transact((s) => equipCosmetic(s, c.slot, id)), `${c.name} in use.`)} />
                    ) : (
                      buyButton(c.price, () => act(transact((s) => buyCosmetic(s, id)), `${c.name} bought!`))
                    )}
                  </View>
                </Panel>
              );
            })}
          </>
        )}

        {tab === 'items' && (
          <Panel style={styles.row}>
            <Text style={styles.icon}>🧊</Text>
            <View style={styles.info}>
              <Text style={styles.name}>Streak Freeze</Text>
              <Text style={styles.stat}>Missed your weekly goal? A freeze keeps your streak of weeks alive.</Text>
              <Text style={styles.muted}>
                Used automatically, one per missed week. You have {state.streakFreezes} / {STREAK_FREEZE.maxOwned}.
              </Text>
              {state.streakFreezes >= STREAK_FREEZE.maxOwned ? (
                <Text style={styles.equippedText}>Fully stocked</Text>
              ) : (
                buyButton(streakFreezePrice(state), () => act(transact(buyStreakFreeze), 'Streak freeze bought!'))
              )}
            </View>
          </Panel>
        )}
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
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.stone,
  },
  tabSelected: { borderColor: colors.gold, backgroundColor: colors.stoneLight },
  tabText: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 13 },
  tabTextSelected: { color: colors.goldLight },
  muted: { color: colors.textMuted, fontSize: 13 },
  notice: { color: colors.goldLight, fontFamily: fonts.title, fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  equipped: { borderColor: colors.gold, borderWidth: 2, borderRadius: radius.md },
  info: { flex: 1, gap: 4 },
  icon: { fontSize: 34, width: 48, textAlign: 'center' },
  sample: { fontFamily: fonts.titleBold, fontSize: 26, width: 72, textAlign: 'center' },
  name: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 17 },
  stat: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  equippedText: { color: colors.rested, fontFamily: fonts.titleBold, fontSize: 14, marginTop: spacing.xs },
});
