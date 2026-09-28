/**
 * HTML page run inside a WebView: opens the front camera, runs MediaPipe Pose
 * ON THE PHONE and posts only 33 body points per frame to the app.
 *
 * Privacy / security:
 * - The video is never recorded, saved or sent: it only lives in the <video> element.
 * - MediaPipe (code, WebAssembly engine and model) is bundled with the app and handed to the page
 *   by the app itself (see mediapipeAssets.ts). The page never uses the internet.
 * - The Content-Security-Policy allows no network destination at all (only local blob: URLs),
 *   and the app blocks any navigation.
 */
export const CAMERA_PAGE_BASE_URL = 'https://cali-incr.local/';

/** Base64 characters per injected chunk (multiple of 4 so each chunk decodes on its own). */
export const ASSET_CHUNK_SIZE = 1 << 20;

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  'connect-src blob: data:',
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
  video,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:scaleX(-1)}
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

// "Hide my image": the video is still analysed but not shown; only the skeleton is drawn on black.
function setHideVideo(hide) {
  video.style.visibility = hide ? 'hidden' : 'visible';
}
window.__setHideVideo = setHideVideo;
setHideVideo(window.__hideVideo === true);

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
  // Map normalized video coords to the "contain" layout (whole image visible, never cropped).
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.min(canvas.width / vw, canvas.height / vh);
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

// Bundled MediaPipe files, sent by the app in base64 chunks (window.__mpChunk / window.__mpDone).
const chunks = {};
let assetsReady;
const assetsPromise = new Promise((resolve) => { assetsReady = resolve; });
window.__mpChunk = (name, index, count, data) => {
  (chunks[name] = chunks[name] || new Array(count))[index] = data;
};
window.__mpDone = () => assetsReady();
function bytes(name) {
  const parts = (chunks[name] || []).map((b64) => {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  });
  delete chunks[name];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { all.set(p, offset); offset += p.length; }
  return all;
}
const blobUrl = (data, type) => URL.createObjectURL(new Blob([data], { type }));

async function start() {
  if (!(await supportsSimd())) {
    send({ type: 'error', code: 'unsupported' });
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    send({ type: 'error', code: e && e.name === 'NotAllowedError' ? 'camera_denied' : 'camera_unavailable' });
    return;
  }
  video.srcObject = stream;
  try {
    send({ type: 'needAssets' });
    await assetsPromise;
    const { PoseLandmarker } = await import(blobUrl(bytes('bundle'), 'text/javascript'));
    const fileset = {
      wasmLoaderPath: blobUrl(bytes('loader'), 'text/javascript'),
      wasmBinaryPath: blobUrl(bytes('wasm'), 'application/wasm'),
    };
    const model = bytes('model');
    const options = (delegate) => ({
      baseOptions: { modelAssetBuffer: model, delegate },
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

// Tiny WebAssembly module using a SIMD instruction: validates only where SIMD is supported.
async function supportsSimd() {
  try {
    return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
  } catch (e) {
    return false;
  }
}

start();
</script>
</body>
</html>`;
