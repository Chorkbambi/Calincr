import { StyleSheet, Text, View } from 'react-native';

import type { BossState } from '../../game';
import type { HitFrame } from '../useHitQueue';
import { colors, fonts } from '../theme';

/** Boss, sword and damage numbers. */
export function BattleArena({ boss, frame }: { boss: BossState; frame: HitFrame }) {
  return (
    <View style={styles.arena}>
      <Text style={styles.boss}>{boss.hp === 0 ? '✝' : '☗'}</Text>
      {frame.hit ? <Text style={styles.damage}>-{frame.hit.damage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { height: 220, alignItems: 'center', justifyContent: 'center' },
  boss: { fontSize: 96, color: colors.parchmentDark },
  damage: { position: 'absolute', top: 16, color: colors.blood, fontFamily: fonts.titleBold, fontSize: 28 },
});
