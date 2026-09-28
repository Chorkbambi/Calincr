import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { MAX_BACKUP_BYTES, toDayKey, type BackupError } from '../../game';
import { useGame } from '../../state/GameProvider';
import { colors, spacing } from '../theme';
import { GoldButton } from './GoldButton';
import { Panel } from './Panel';

const IMPORT_ERRORS: Record<BackupError, string> = {
  too_big: 'This file is too big to be a Calincr backup.',
  not_json: 'This file is not a Calincr backup.',
  not_a_backup: 'This file is not a Calincr backup.',
  newer_version: 'This backup comes from a newer version of Calincr. Update the app first.',
};

/** Export / import of all progress as a file the player keeps (no account, no server). */
export function BackupPanel() {
  const { exportBackup, importBackup } = useGame();
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    try {
      const text = await exportBackup();
      const file = new File(Paths.cache, `calincr-backup-${toDayKey(new Date())}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Export', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Calincr backup' });
    } catch {
      Alert.alert('Export failed', 'The backup could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) {
      Alert.alert('Import failed', IMPORT_ERRORS.too_big);
      return;
    }
    Alert.alert(
      'Replace your progress?',
      'Everything in the app (levels, gold, swords, calendar, settings) will be replaced by the backup. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const error = await importBackup(await new File(asset.uri).text());
              Alert.alert(error ? 'Import failed' : 'Backup restored', error ? IMPORT_ERRORS[error] : 'Welcome back, hero!');
            } catch {
              Alert.alert('Import failed', 'The file could not be read.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Panel title="Backup">
      <Text style={styles.text}>
        Your progress only lives on this phone. Export a backup file and keep it somewhere safe (Files, Drive, e-mail to
        yourself…) to restore it after changing phone or reinstalling.
      </Text>
      <GoldButton label="Export backup" variant="stone" onPress={doExport} disabled={busy} />
      <GoldButton label="Import backup" variant="stone" onPress={doImport} disabled={busy} />
      <Text style={styles.muted}>The file contains your game progress and training history. Keep it private.</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
