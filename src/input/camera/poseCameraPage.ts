/**
 * HTML page run inside a WebView: opens the front camera, runs MediaPipe Pose
 * ON THE PHONE and posts only 33 body points per frame to the app.
 *
 * Privacy / security:
 * - The video is never recorded, saved or sent: it only lives in the <video> element.
 * - The Content-Security-Policy only lets the page DOWNLOAD the pinned library and model
 *   (cdn.jsdelivr.net, storage.googleapis.com). Images can't be sent anywhere
 *   (no img/form/frame/navigation targets), and the app blocks any navigation.
 * - Versions are pinned so the code can't change under us.
 */
export const MEDIAPIPE_VERSION = '1.0.1';
export const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const CAMERA_PAGE_BASE_URL = 'https://cali-incr.local/';

const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  'connect-src https://cdn.jsdelivr.net https://storage.googleapis.com',
  'img-src data: blob:',
  'media-src blob: mediastream:',
  "style-src 'unsafe-inline'",
  'worker-src blob:',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

export const POSE_CAMERA_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<style>
  html,body{margin:0;height:100%;background:#1b1510;overflow:hidden}
  video,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
</style>
</head>
<body>
<video id="video" playsinline muted autoplay></video>
<canvas id="overlay"></canvas>
<script type="module">
const send = (m) => { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} };
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[28,30],[30,32]];
let stream = null;
let landmarker = null;
let lastSent = 0;
let lastNoPose = 0;

function stop() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
}
window.addEventListener('pagehide', stop);

function draw(lm) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lm) return;
  // Map normalized video coords to the "cover" layout.
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.max(canvas.width / vw, canvas.height / vh);
  const ox = (canvas.width - vw * scale) / 2, oy = (canvas.height - vh * scale) / 2;
  const px = (p) => [ox + p.x * vw * scale, oy + p.y * vh * scale];
  ctx.strokeStyle = '#f0cf72';
  ctx.lineWidth = 4;
  for (const [a, b] of BONES) {
    if (lm[a].visibility < 0.5 || lm[b].visibility < 0.5) continue;
    const [x1, y1] = px(lm[a]);
    const [x2, y2] = px(lm[b]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
}

function loop() {
  if (!stream) return;
  const now = performance.now();
  if (landmarker && video.readyState >= 2 && now - lastSent >= 66) {
    lastSent = now;
    const result = landmarker.detectForVideo(video, now);
    const lm = result.landmarks && result.landmarks[0];
    draw(lm);
    if (lm) {
      send({
        type: 'pose',
        t: Math.round(now),
        aspect: video.videoWidth / video.videoHeight,
        lm: lm.map((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000, Math.round((p.visibility ?? 0) * 100) / 100]),
      });
    } else if (now - lastNoPose > 500) {
      lastNoPose = now;
      send({ type: 'nopose', t: Math.round(now) });
    }
  }
  requestAnimationFrame(loop);
}

async function start() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  } catch (e) {
    send({ type: 'error', code: e && e.name === 'NotAllowedError' ? 'camera_denied' : 'camera_unavailable' });
    return;
  }
  video.srcObject = stream;
  try {
    const { FilesetResolver, PoseLandmarker } = await import('${CDN}/vision_bundle.mjs');
    const fileset = await FilesetResolver.forVisionTasks('${CDN}/wasm');
    const options = (delegate) => ({
      baseOptions: { modelAssetPath: '${POSE_MODEL_URL}', delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    try {
      landmarker = await PoseLandmarker.createFromOptions(fileset, options('GPU'));
    } catch (gpuError) {
      landmarker = await PoseLandmarker.createFromOptions(fileset, options('CPU'));
    }
  } catch (e) {
    send({ type: 'error', code: 'model_failed' });
    return;
  }
  send({ type: 'ready' });
  requestAnimationFrame(loop);
}

start();
</script>
</body>
</html>`;
