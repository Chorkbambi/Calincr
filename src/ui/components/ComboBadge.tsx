import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { COMBO, comboBonus } from '../../game';
import { colors, fonts } from '../theme';

/** "🔥 Combo 12 · +10% damage" while the combo is alive; disappears after a long pause. */
export function ComboBadge({ count, lastHitAt }: { count: number; lastHitAt: number }) {
  const [now, setNow] = useState(Date.now());
  const alive = count > 1 && now - lastHitAt <= COMBO.windowMs;

  useEffect(() => {
    setNow(Date.now());
    if (count <= 1) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [count, lastHitAt]);

  if (!alive) return null;
  const bonus = Math.round(comboBonus(count) * 100);
  return (
    <Text style={styles.text} accessibilityLabel={`Combo ${count}${bonus > 0 ? `, plus ${bonus} percent damage` : ''}`}>
      🔥 Combo {count}
      {bonus > 0 ? ` · +${bonus}% damage` : ` · +5% at ${COMBO.hitsPerStep}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: '#ff9a4a', fontFamily: fonts.titleBold, fontSize: 15, textAlign: 'center', textShadowColor: colors.background, textShadowRadius: 3 },
});
