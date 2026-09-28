import { useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { EXERCISE_GUIDES, getExercise, type ExerciseId } from '../../game';
import { describeBodyParts, requiredBodyParts } from '../../pose/visibility';
import { GoldButton } from '../../ui/components/GoldButton';
import { Panel } from '../../ui/components/Panel';
import { colors, fonts, radius, spacing } from '../../ui/theme';
import type { CameraRepSource, CameraState } from '../CameraRepSource';
import { UNDO_MESSAGE } from '../ManualRepControls';
import { sendMediapipeAssets } from './mediapipeAssets';
import { isAllowedCameraNavigation, WEBVIEW_ORIGIN_WHITELIST } from './navigation';
import { CAMERA_PAGE_BASE_URL, POSE_CAMERA_HTML } from './poseCameraPage';

export const OFFLINE_NOTICE =
  'Works offline: the body-tracking engine (Google MediaPipe) is built into the app and runs on your phone. No internet needed, nothing is ever sent.';

const ERROR_TEXT: Record<Extract<CameraState, { stage: 'error' }>['code'], string> = {
  camera_denied: 'Camera access was refused. Allow it in your phone settings, or switch to manual mode in Settings.',
  camera_unavailable: 'No camera available.',
  model_failed: 'Body tracking could not start on this phone. Try again, or switch to manual mode in Settings.',
  unsupported: 'This phone is too old for camera tracking. Please use manual mode in Settings.',
  unknown: 'Something went wrong with the camera.',
};

const allowOnlyCameraPage = (request: ShouldStartLoadRequest) => isAllowedCameraNavigation(request.url);

function statusText(state: CameraState): string {
  if (state.stage === 'loading') return 'Starting body tracking…';
  if (state.stage === 'error') return ERROR_TEXT[state.code];
  if (state.missing.length > 0) return `Can’t see your ${describeBodyParts(state.missing)} — adjust the phone`;
  if (!state.body.tracking) return 'Step back until you are fully in view';
  if (state.body.phase === 'holding') return 'Holding — keep going!';
  if (state.body.phase === 'waiting') return 'Get into the start position';
  return 'Tracking ✓';
}

const lockPortrait = () => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

/**
 * Camera input: front camera + on-device pose detection.
 * The camera only starts when the player presses "Start camera" for the chosen exercise,
 * opens full screen (the whole image is shown, never cropped) and stops when closed,
 * when the exercise changes or when the Fight tab is left.
 */
export function CameraRepControls({
  source,
  exerciseId,
  active,
  hud,
}: {
  source: CameraRepSource;
  exerciseId: ExerciseId;
  active: boolean;
  /** Fight info shown on top of the camera (enemy, HP…). */
  hud?: ReactNode;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<CameraState>(source.getState());
  const [started, setStarted] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [session, setSession] = useState(0);
  const [count, setCount] = useState(0);
  const [undoShown, setUndoShown] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<WebView>(null);
  const exercise = getExercise(exerciseId);
  const timed = exercise.unit === 'seconds';
  const guide = EXERCISE_GUIDES[exerciseId];
  const parts = describeBodyParts(requiredBodyParts(exerciseId));

  useEffect(() => source.onState(setState), [source]);
  useEffect(() => source.setExercise(exerciseId), [source, exerciseId]);
  useEffect(
    () =>
      source.subscribe((event) => setCount((c) => c + (event.type === 'reps' ? event.count : event.seconds))),
    [source],
  );

  const stop = () => {
    setStarted(false);
    setLandscape(false);
    void lockPortrait();
  };

  // Changing exercise or leaving the tab turns the camera off.
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);
  useEffect(() => {
    if (!active) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      void lockPortrait();
    },
    [],
  );

  const start = () => {
    source.restart();
    setCount(0);
    setSession((s) => s + 1);
    setStarted(true);
  };

  const rotate = () => {
    const next = !landscape;
    setLandscape(next);
    ScreenOrientation.lockAsync(
      next ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {});
  };

  // Like manual mode, a wrong count can't be removed: it has to be made up for.
  const undo = () => {
    setUndoShown(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoShown(false), 3000);
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>
          Camera mode counts your reps by watching your movements. The video is analysed on your phone only: it is never
          recorded, saved or sent anywhere.
        </Text>
        <Text style={styles.muted}>📴 {OFFLINE_NOTICE}</Text>
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
      <Panel title={`Camera setup · ${exercise.name}`}>
        <Text style={styles.text}>
          👁 The camera must see your <Text style={styles.strong}>{parts}</Text> during the whole exercise.
        </Text>
        <Text style={styles.text}>📷 {guide.camera}</Text>
        <Text style={styles.text}>
          ⟲ Lying or wide exercises (push-ups, planks…) fit better with the phone turned sideways: use the Rotate button.
        </Text>
        <GoldButton big label="Start camera" onPress={start} disabled={!active} />
        <Text style={styles.muted}>🔒 Analysed on your phone. Nothing is recorded, saved or sent.</Text>
        <Text style={styles.muted}>📴 {OFFLINE_NOTICE}</Text>
      </Panel>

      <Modal
        visible={started && active}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={stop}
      >
        <View style={styles.full}>
          <WebView
            key={session}
            source={{ html: POSE_CAMERA_HTML, baseUrl: CAMERA_PAGE_BASE_URL }}
            originWhitelist={WEBVIEW_ORIGIN_WHITELIST}
            onShouldStartLoadWithRequest={allowOnlyCameraPage}
            ref={webViewRef}
            onMessage={(event: WebViewMessageEvent) => {
              const msg = source.handleMessage(event.nativeEvent.data);
              if (msg?.type === 'needAssets') {
                sendMediapipeAssets((script) => webViewRef.current?.injectJavaScript(script)).catch(() =>
                  source.handleMessage(JSON.stringify({ type: 'error', code: 'model_failed' })),
                );
              }
            }}
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
          <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.top} pointerEvents="box-none">
              {hud}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{statusText(state)}</Text>
              </View>
            </View>
            <View style={styles.bottom}>
              <View style={styles.counterRow}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.counter}>{timed ? `${count} s` : `${count} reps`}</Text>
              </View>
              {state.stage === 'error' ? (
                <GoldButton label="Retry" variant="stone" onPress={() => setSession((s) => s + 1)} />
              ) : null}
              <View style={styles.row}>
                {(timed ? [5, 15] : [1, 5]).map((n) => (
                  <GoldButton
                    key={n}
                    label={timed ? `+${n} s` : `+${n}`}
                    variant="stone"
                    style={styles.flex}
                    onPress={() => source.addManually(n, timed ? 'seconds' : 'reps')}
                  />
                ))}
                <GoldButton label="↶ Undo" variant="stone" style={styles.flex} onPress={undo} />
              </View>
              {undoShown ? <Text style={styles.undo}>{UNDO_MESSAGE}</Text> : null}
              <View style={styles.row}>
                <GoldButton label={landscape ? '⟲ Portrait' : '⟳ Rotate'} variant="stone" style={styles.flex} onPress={rotate} />
                <GoldButton label="Stop camera" variant="danger" style={styles.flex} onPress={stop} />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  strong: { color: colors.goldLight, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 12 },
  full: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  top: { padding: spacing.sm, gap: spacing.xs },
  bottom: {
    marginTop: 'auto',
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: 'rgba(27,21,16,0.72)',
  },
  badge: { alignSelf: 'center', backgroundColor: 'rgba(27,21,16,0.8)', borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: spacing.md },
  badgeText: { color: colors.parchment, fontFamily: fonts.title, fontSize: 13, textAlign: 'center' },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  exerciseName: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 16, flexShrink: 1 },
  counter: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 24 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  undo: { color: colors.tired, fontFamily: fonts.title, fontSize: 14, textAlign: 'center' },
});
