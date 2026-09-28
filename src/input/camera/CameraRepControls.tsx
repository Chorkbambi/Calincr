import { useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { EXERCISE_GUIDES, getExercise, type ExerciseId } from '../../game';
import { GoldButton } from '../../ui/components/GoldButton';
import { colors, fonts, radius, spacing } from '../../ui/theme';
import type { CameraRepSource, CameraState } from '../CameraRepSource';
import { UNDO_MESSAGE } from '../ManualRepControls';
import { isAllowedCameraNavigation, WEBVIEW_ORIGIN_WHITELIST } from './navigation';
import { CAMERA_PAGE_BASE_URL, POSE_CAMERA_HTML } from './poseCameraPage';

export const INTERNET_NOTICE =
  'Internet is needed when camera mode starts: the app downloads Google’s body-tracking engine (MediaPipe, about 18 MB) so it can run on your phone. It is a download only — your video is never uploaded. Your phone may keep a copy to start faster next time.';

const ERROR_TEXT: Record<Extract<CameraState, { stage: 'error' }>['code'], string> = {
  camera_denied: 'Camera access was refused. Allow it in your phone settings, or switch to manual mode in Settings.',
  camera_unavailable: 'No camera available.',
  model_failed:
    'Could not download the body-tracking engine. Check your internet connection: it is needed to start camera mode (download only — nothing is uploaded). You can also switch to manual mode in Settings.',
  unknown: 'Something went wrong with the camera.',
};

const allowOnlyCameraPage = (request: ShouldStartLoadRequest) => isAllowedCameraNavigation(request.url);

function statusText(state: CameraState): string {
  if (state.stage === 'loading') return 'Downloading the body-tracking engine (needs internet)…';
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
  const [undoShown, setUndoShown] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timed = getExercise(exerciseId).unit === 'seconds';
  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);

  // Like manual mode, a wrong count can't be removed: it has to be made up for.
  const undo = () => {
    setUndoShown(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoShown(false), 3000);
  };

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
        <Text style={styles.muted}>🌐 {INTERNET_NOTICE}</Text>
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
            originWhitelist={WEBVIEW_ORIGIN_WHITELIST}
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

      <View style={styles.correction}>
        <Text style={styles.correctionTitle}>Camera missed some? Add them yourself:</Text>
        <View style={styles.row}>
          {(timed ? [5, 15] : [1, 5]).map((n) => (
            <GoldButton
              key={n}
              label={timed ? `+${n} s` : `+${n} rep${n > 1 ? 's' : ''}`}
              variant="stone"
              style={styles.flex}
              onPress={() => source.addManually(n, timed ? 'seconds' : 'reps')}
            />
          ))}
          <GoldButton label="↶ Undo" variant="stone" style={styles.flex} onPress={undo} />
        </View>
        {undoShown ? <Text style={styles.undo}>{UNDO_MESSAGE}</Text> : null}
      </View>

      <Text style={styles.muted}>🔒 Analysed on your phone. Nothing is recorded, saved or sent.</Text>
      <Text style={styles.muted}>🌐 {INTERNET_NOTICE}</Text>
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
  correction: { gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
  correctionTitle: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.xs },
  undo: { color: colors.tired, fontFamily: fonts.title, fontSize: 14, textAlign: 'center' },
  muted: { color: colors.textMuted, fontSize: 12 },
});
