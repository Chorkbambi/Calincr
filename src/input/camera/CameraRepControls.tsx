import { useCameraPermissions } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { CALIBRATION, EXERCISE_GUIDES, getExercise, WORKOUT, type ExerciseId } from '../../game';
import type { TrackerConfig } from '../../pose/trackers';
import { describeBodyParts, requiredBodyParts } from '../../pose/visibility';
import { GoldButton } from '../../ui/components/GoldButton';
import { Panel } from '../../ui/components/Panel';
import { colors, fonts, radius, spacing } from '../../ui/theme';
import type { CameraRepSource, CameraState } from '../CameraRepSource';
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

/** Short status line over the camera; null when all is well (the screen stays clear). */
function statusText(state: CameraState): string | null {
  if (state.stage === 'loading') return 'Starting body tracking…';
  if (state.stage === 'error') return ERROR_TEXT[state.code];
  if (state.missing.length > 0) return `Can’t see your ${describeBodyParts(state.missing)} — adjust the phone`;
  if (!state.body.tracking) return 'Step back until you are fully in view';
  if (state.body.phase === 'waiting') return 'Get into the start position';
  return null;
}

const lockPortrait = () => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

/** Calibration: waiting for the camera to start, then seconds left. */
type Calibration = 'waiting' | number;

/**
 * Camera input: front camera + on-device pose detection.
 * The camera opens full screen when the workout starts ("Start camera") and closes by itself when its last set
 * is done, when the player stops it, or when the Fight tab is left. While it is open, nothing needs a tap:
 * the screen shows the image, the count and the rest countdown. It follows the phone when turned sideways.
 */
export function CameraRepControls({
  source,
  exerciseId,
  active,
  running,
  onStart,
  onStop,
  overlay,
  hideImage,
  onHideImageChange,
  calibrated,
  onCalibrated,
}: {
  source: CameraRepSource;
  exerciseId: ExerciseId;
  active: boolean;
  /** A workout is in progress: the camera is open. */
  running: boolean;
  /** "Start camera": the workout starts. */
  onStart: () => void;
  /** The player closed the camera before the end. */
  onStop: () => void;
  /** Workout progress shown at the bottom of the camera (count, set, rest). */
  overlay?: ReactNode;
  /** Show only the skeleton on black instead of the video image. */
  hideImage: boolean;
  onHideImageChange: (hide: boolean) => void;
  /** True if this exercise has the player's own thresholds. */
  calibrated: boolean;
  /** Saves (or, with null, removes) this exercise's calibration. */
  onCalibrated: (tracker: TrackerConfig | null) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<CameraState>(source.getState());
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  /** Camera page shown (a new number = a fresh page), null while closed. */
  const [session, setSession] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const exercise = getExercise(exerciseId);
  const timed = exercise.unit === 'seconds';
  const guide = EXERCISE_GUIDES[exerciseId];
  const parts = describeBodyParts(requiredBodyParts(exerciseId));
  const open = active && (running || calibration !== null);

  useEffect(() => source.onState(setState), [source]);
  useEffect(() => source.setExercise(exerciseId), [source, exerciseId]);

  // Each opening starts a fresh camera page. While open, the screen follows the phone (portrait or sideways).
  useEffect(() => {
    if (!open) {
      setSession(null);
      void lockPortrait();
      return;
    }
    source.restart();
    setSession((s) => (s ?? 0) + 1);
    ScreenOrientation.unlockAsync().catch(() => {});
  }, [open, source]);
  const retry = () => {
    source.restart();
    setSession((s) => (s ?? 0) + 1);
  };
  useEffect(() => () => void lockPortrait(), []);

  // Changing exercise or leaving the tab cancels a calibration.
  useEffect(() => {
    if (calibration !== null && !active) cancelCalibration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    if (calibration !== null) cancelCalibration();
    setNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  // Calibration: once the camera runs, record the player's range of motion for a few seconds.
  useEffect(() => {
    if (calibration !== 'waiting' || state.stage !== 'running') return;
    source.startCalibration();
    setCalibration(Math.round(CALIBRATION.durationMs / 1000));
  }, [calibration, state.stage, source]);
  useEffect(() => {
    if (typeof calibration !== 'number') return undefined;
    if (calibration <= 0) {
      const result = source.finishCalibration();
      setCalibration(null);
      if ('tracker' in result) {
        onCalibrated(result.tracker);
        setNotice('Calibrated ✓ The camera now fits your movement.');
      } else {
        setNotice(
          result.error === 'not_enough_movement'
            ? 'Not enough movement seen. Do full, slow reps with the right body parts visible, then try again.'
            : 'Could not see you well enough. Check the camera placement and try again.',
        );
      }
      return undefined;
    }
    const t = setTimeout(() => setCalibration((s) => (typeof s === 'number' ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibration]);

  const cancelCalibration = () => {
    if (source.isCalibrating) source.finishCalibration();
    setCalibration(null);
  };

  const close = () => (calibration !== null ? cancelCalibration() : onStop());

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

  const status = statusText(state);

  return (
    <View style={styles.box}>
      <Panel title={`Camera · ${exercise.name}`}>
        <Text style={styles.text}>
          👁 The camera must see your <Text style={styles.strong}>{parts}</Text> during the whole exercise.
        </Text>
        <Text style={styles.text}>📷 {guide.camera}</Text>
        <Text style={styles.text}>
          ⟲ Lying or wide exercises (push-ups, planks…) fit better with the phone sideways: just turn it, the camera
          turns with it (if it doesn’t, switch off your phone’s rotation lock).
        </Text>
        <Pressable
          onPress={() => onHideImageChange(!hideImage)}
          accessibilityRole="switch"
          accessibilityState={{ checked: !hideImage }}
          accessibilityLabel="Show my image"
          style={[styles.pill, hideImage && styles.pillOn]}
        >
          <Text style={[styles.pillText, hideImage && styles.pillTextOn]}>
            {hideImage ? '🙈 Image: off — stick figure only' : '👁 Image: on — tap to see only a stick figure'}
          </Text>
        </Pressable>
        <GoldButton big label="▶ Start camera" onPress={onStart} disabled={!active} />
        <Text style={styles.muted}>
          No need to touch the phone: each set ends at its target (or {WORKOUT.idleEndSeconds} s after your last rep), the
          rest timer runs, then the next set starts. At the end you check the counts.
        </Text>
        <GoldButton
          label={calibrated ? '🎯 Calibrate again' : '🎯 Calibrate (reps not counted well?)'}
          variant="stone"
          onPress={() => {
            setNotice(null);
            setCalibration('waiting');
          }}
          disabled={!active}
        />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {calibrated ? (
          <Pressable onPress={() => onCalibrated(null)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>This exercise is calibrated for you · Reset calibration</Text>
          </Pressable>
        ) : null}
        <Text style={styles.muted}>🔒 Analysed on your phone. Nothing is recorded, saved or sent.</Text>
        <Text style={styles.muted}>📴 {OFFLINE_NOTICE}</Text>
      </Panel>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
        onRequestClose={close}
      >
        <View style={styles.full}>
          {session !== null ? (
            <WebView
              key={session}
              source={{ html: POSE_CAMERA_HTML, baseUrl: CAMERA_PAGE_BASE_URL }}
              originWhitelist={WEBVIEW_ORIGIN_WHITELIST}
              onShouldStartLoadWithRequest={allowOnlyCameraPage}
              ref={webViewRef}
              injectedJavaScriptBeforeContentLoaded={`window.__hideVideo=${hideImage ? 'true' : 'false'};true;`}
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
          ) : null}
          <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.top} pointerEvents="box-none">
              <View style={styles.badges} pointerEvents="none">
                <Text style={styles.privacyText}>🔒 Not recorded</Text>
                {status ? <Text style={styles.status}>{status}</Text> : null}
              </View>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Stop camera" hitSlop={8} style={styles.stop}>
                <Text style={styles.stopText}>✕ Stop</Text>
              </Pressable>
            </View>
            {state.stage === 'error' ? (
              <View style={styles.center}>
                <GoldButton label="Retry" variant="stone" onPress={retry} />
              </View>
            ) : null}
            {calibration !== null ? (
              <View style={styles.center} pointerEvents="none">
                <View style={styles.calibration}>
                  <Text style={styles.calibrationTitle}>
                    {calibration === 'waiting' ? 'Calibration' : `Calibrating… ${calibration}s`}
                  </Text>
                  <Text style={styles.calibrationText}>
                    {timed ? 'Hold the position as well as you can.' : 'Do 3 slow, full reps now. They are not counted.'}
                  </Text>
                </View>
              </View>
            ) : null}
            {overlay && calibration === null ? (
              <View style={styles.bottom} pointerEvents="none">
                {overlay}
              </View>
            ) : null}
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
  link: { color: colors.goldLight, fontSize: 12, textDecorationLine: 'underline' },
  notice: { color: colors.parchment, fontSize: 13 },
  pill: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.stoneLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  pillOn: { borderColor: colors.gold },
  pillText: { color: colors.text, fontSize: 13 },
  pillTextOn: { color: colors.goldLight },
  full: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: spacing.sm, gap: spacing.sm },
  badges: { flexShrink: 1, gap: 4, alignItems: 'flex-start' },
  privacyText: {
    color: colors.goldLight,
    fontSize: 11,
    backgroundColor: 'rgba(27,21,16,0.7)',
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  status: {
    color: colors.parchment,
    fontFamily: fonts.title,
    fontSize: 13,
    backgroundColor: 'rgba(27,21,16,0.8)',
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  stop: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(110,25,20,0.85)',
    borderWidth: 1,
    borderColor: colors.blood,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: { color: colors.parchment, fontFamily: fonts.titleBold, fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  bottom: {
    marginTop: 'auto',
    alignSelf: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(27,21,16,0.6)',
  },
  calibration: {
    backgroundColor: 'rgba(27,21,16,0.9)',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: spacing.md,
    gap: 4,
  },
  calibrationTitle: { color: colors.goldLight, fontFamily: fonts.titleBold, fontSize: 20, textAlign: 'center' },
  calibrationText: { color: colors.parchment, fontSize: 14, textAlign: 'center' },
});
