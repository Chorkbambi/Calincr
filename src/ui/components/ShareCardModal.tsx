import { useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { shareViewAsImage } from '../share';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { SwordFigure } from './SwordFigure';

export interface ShareCardData {
  badge: string;
  title: string;
  subtitle?: string;
  rows: [string, string][];
  /** Line under the rows (not part of the shared picture's data, just flavour). */
  footer?: string;
}

/** A card the player can share as a picture (weekly recap, achievement). Only game numbers are shown. */
export function ShareCardModal({
  card,
  onClose,
  closeLabel = 'Close',
  swordTier = 0,
}: {
  card: ShareCardData | null;
  onClose: () => void;
  closeLabel?: string;
  swordTier?: number;
}) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (!card) return;
    setBusy(true);
    try {
      const shared = await shareViewAsImage(cardRef, card.title);
      if (!shared) Alert.alert('Sharing unavailable', 'This phone cannot share pictures from the app.');
    } catch {
      Alert.alert('Sharing failed', 'The picture could not be created.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={card !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {card && (
          <View style={styles.wrapper}>
            {/* Captured as a picture: keep it self-contained (collapsable=false for Android). */}
            <View ref={cardRef} collapsable={false} style={styles.card}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.badge}>{card.badge}</Text>
                  <Text style={styles.title}>{card.title}</Text>
                  {card.subtitle ? <Text style={styles.muted}>{card.subtitle}</Text> : null}
                </View>
                <SwordFigure size={84} tier={swordTier} />
              </View>
              {card.rows.map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
              {card.footer ? <Text style={styles.footer}>{card.footer}</Text> : null}
              <Text style={styles.brand}>⚔️ Calincr</Text>
            </View>
            <View style={styles.buttons}>
              <GoldButton label="📤 Share" variant="stone" style={styles.flex} disabled={busy} onPress={share} />
              <GoldButton label={closeLabel} style={styles.flex} onPress={onClose} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  wrapper: { gap: spacing.md },
  card: {
    backgroundColor: colors.stone,
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  badge: { fontSize: 36 },
  title: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 15, flexShrink: 1 },
  value: { color: colors.parchment, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  footer: { color: colors.text, fontSize: 15, marginTop: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
  brand: { color: colors.gold, fontFamily: fonts.titleBold, fontSize: 14, textAlign: 'right', marginTop: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
