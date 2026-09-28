import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { ASSET_CHUNK_SIZE } from './poseCameraPage';

/** MediaPipe files shipped inside the app (see assets/mediapipe/NOTICE.txt). */
const FILES = {
  bundle: require('../../../assets/mediapipe/vision_bundle.mjs.bin'),
  loader: require('../../../assets/mediapipe/vision_wasm_internal.js.bin'),
  wasm: require('../../../assets/mediapipe/vision_wasm_internal.wasm'),
  model: require('../../../assets/mediapipe/pose_landmarker_lite.task'),
} as const;

type AssetName = keyof typeof FILES;

let cache: Promise<Record<AssetName, string>> | null = null;

/** Reads the bundled files once per app session, as base64. */
function loadAll(): Promise<Record<AssetName, string>> {
  cache ??= (async () => {
    const entries = await Promise.all(
      (Object.keys(FILES) as AssetName[]).map(async (name) => {
        const asset = Asset.fromModule(FILES[name]);
        await asset.downloadAsync();
        if (!asset.localUri) throw new Error(`Missing asset ${name}`);
        return [name, await new File(asset.localUri).base64()] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<AssetName, string>;
  })().catch((error: unknown) => {
    cache = null;
    throw error;
  });
  return cache;
}

/**
 * Hands the bundled MediaPipe files to the camera page, in chunks, through injected JavaScript.
 * Nothing is downloaded from the internet.
 */
export async function sendMediapipeAssets(inject: (script: string) => void): Promise<void> {
  const files = await loadAll();
  for (const name of Object.keys(files) as AssetName[]) {
    const data = files[name];
    const count = Math.max(1, Math.ceil(data.length / ASSET_CHUNK_SIZE));
    for (let i = 0; i < count; i++) {
      const chunk = data.slice(i * ASSET_CHUNK_SIZE, (i + 1) * ASSET_CHUNK_SIZE);
      // Base64 only contains [A-Za-z0-9+/=]: safe inside a JS string literal.
      inject(`window.__mpChunk(${JSON.stringify(name)},${i},${count},"${chunk}");true;`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  inject('window.__mpDone();true;');
}
