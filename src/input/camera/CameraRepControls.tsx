import { useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { EXERCISE_GUIDES, type ExerciseId } from '../../game';
import { GoldButton } from '../../ui/components/GoldButton';
import { colors, fonts, radius, spacing } from '../../ui/theme';
import type { CameraRepSource, CameraState } from '../CameraRepSource';
import { CAMERA_PAGE_BASE_URL, POSE_CAMERA_HTML } from './poseCameraPage';

const ERROR_TEXT: Record<Extract<CameraState, { stage: 'error' }>['code'], string> = {
  camera_denied: 'Camera access was refused. Allow it in your phone settings, or switch to manual mode in Settings.',
  camera_unavailable: 'No camera available.',
  model_failed: 'Could not load the body-tracking model. It needs internet the first time.',
  unknown: 'Something went wrong with the camera.',
};

/** Only the camera page itself may load: every navigation is blocked. */
const allowOnlyCameraPage = (request: ShouldStartLoadRequest) =>
  request.url === 'about:blank' || request.url.startsWith(CAMERA_PAGE_BASE_URL);

function statusText(state: CameraState): string {
  if (state.stage === 'loading') return 'Starting camera and body tracking…';
  if (state.stage === 'error') return ERROR_TEXT[state.code];
  if (!state.body.tracking) return 'Step back until your whole body is visible';
  if (state.body.phase === 'holding') return 'Holding — keep going!';
  if (state.body.phase === 'waiting') return 'Get into the start position';
  return 'Tracking ✓';
}

/**
 * Camera input: front camera + on-device pose detection.
 * The WebView is only mounted while `active` (combat tab focused), so the camera is off otherwise.
 */
export function CameraRepControls({ source, exerciseId, active }: { source: CameraRepSource; exerciseId: ExerciseId; active: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<CameraState>(source.getState());
  const [session, setSession] = useState(0);

  useEffect(() => source.onState(setState), [source]);
  useEffect(() => source.setExercise(exerciseId), [source, exerciseId]);
  useEffect(() => {
    if (active) source.restart();
  }, [active, session, source]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>
          Camera mode counts your reps by watching your movements. The video is analysed on your phone only: it is never
          recorded, saved or sent anywhere.
        </Text>
        <GoldButton
          label={permission.canAskAgain ? 'Allow camera' : 'Camera blocked — open phone settings'}
          onPress={() => void requestPermission()}
          disabled={!permission.canAskAgain}
        />
        <Text style={styles.muted}>Prefer not to film yourself? Choose manual mode in Settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.preview}>
        {active ? (
          <WebView
            key={session}
            source={{ html: POSE_CAMERA_HTML, baseUrl: CAMERA_PAGE_BASE_URL }}
            originWhitelist={[CAMERA_PAGE_BASE_URL, 'about:blank']}
            onShouldStartLoadWithRequest={allowOnlyCameraPage}
            onMessage={(event: WebViewMessageEvent) => source.handleMessage(event.nativeEvent.data)}
            mediaCapturePermissionGrantType="grantIfSameHostElseDeny"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            allowFileAccess={false}
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            geolocationEnabled={false}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            mixedContentMode="never"
            scrollEnabled={false}
            style={styles.webview}
          />
        ) : null}
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{statusText(state)}</Text>
        </View>
      </View>
      {state.stage === 'error' ? <GoldButton label="Retry" variant="stone" onPress={() => setSession((s) => s + 1)} /> : null}
      <Text style={styles.muted}>📷 {EXERCISE_GUIDES[exerciseId].camera}</Text>
      <Text style={styles.muted}>🔒 Analysed on your phone. Nothing is recorded, saved or sent.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  preview: {
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.goldDark,
    backgroundColor: colors.background,
  },
  webview: { flex: 1, backgroundColor: colors.background },
  badge: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(27,21,16,0.8)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  badgeText: { color: colors.parchment, fontFamily: fonts.title, fontSize: 13, textAlign: 'center' },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 12 },
});
