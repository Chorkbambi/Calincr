import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '../state/GameProvider';
import { GoldButton } from '../ui/components/GoldButton';
import { Panel } from '../ui/components/Panel';
import { colors, fonts, spacing } from '../ui/theme';

export default function SettingsScreen() {
  const { resetProgress } = useGame();

  const confirmReset = () => {
    Alert.alert(
      'Réinitialiser la progression ?',
      'Niveaux, boss vaincus et tout l’historique d’entraînement seront effacés définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: () => {
            resetProgress().then(
              () => Alert.alert('Progression réinitialisée', 'Une nouvelle aventure commence.'),
              () => Alert.alert('Erreur', 'La réinitialisation a échoué.'),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Réglages</Text>

        <Panel title="Progression">
          <Text style={styles.text}>
            Efface les niveaux des muscles, l’épée, les boss vaincus et le calendrier. Cette action est irréversible.
          </Text>
          <GoldButton label="Réinitialiser la progression" variant="danger" onPress={confirmReset} />
        </Panel>

        <Panel title="À propos">
          <Text style={styles.text}>
            Cali-Incr transforme tes exercices au poids du corps en combat : chaque répétition est un coup d’épée
            contre le boss. Tes muscles gagnent de l’XP, et les dégâts de chaque coup sont la somme de leurs niveaux.
          </Text>
          <Text style={styles.text}>
            Équilibre ton entraînement et respecte le repos : un muscle reposé gagne jusqu’à ×1,5 d’XP, un muscle
            entraîné plusieurs jours de suite en gagne moins.
          </Text>
          <Text style={styles.text}>Toutes les données restent sur ce téléphone. Aucun compte, aucun serveur.</Text>
          <Text style={styles.muted}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 26 },
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 },
});
