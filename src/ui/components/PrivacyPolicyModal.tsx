import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRIVACY_POLICY, PRIVACY_POLICY_UPDATED } from '../content/privacyPolicy';
import { colors, fonts, radius, spacing } from '../theme';
import { GoldButton } from './GoldButton';

export function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Privacy policy</Text>
          <Text style={styles.muted}>Last updated: {PRIVACY_POLICY_UPDATED}</Text>
          {PRIVACY_POLICY.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.heading}>{section.title}</Text>
              {section.body.map((line, i) => (
                <Text key={i} style={styles.text}>
                  • {line}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
        <GoldButton label="Close" onPress={onClose} style={styles.close} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingBottom: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 24 },
  section: { gap: 6, marginTop: spacing.md, backgroundColor: colors.stone, borderRadius: radius.md, padding: spacing.md },
  heading: { color: colors.gold, fontFamily: fonts.titleBold, fontSize: 15 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 12 },
  close: { marginHorizontal: spacing.lg },
});
