import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Turns a view into a PNG in the app's temporary folder and opens the phone's share sheet.
 * Nothing is sent by the app: the player chooses where the picture goes (or cancels).
 */
export async function shareViewAsImage(ref: RefObject<View | null>, title: string): Promise<boolean> {
  if (!ref.current || !(await Sharing.isAvailableAsync())) return false;
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
  return true;
}
