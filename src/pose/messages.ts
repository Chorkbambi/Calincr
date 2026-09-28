import { LANDMARK_COUNT, type Landmark, type PoseFrame } from './landmarks';

/** Messages the camera page is allowed to send. Anything else is dropped. */
export type BridgeMessage =
  | { type: 'ready' }
  | { type: 'error'; code: 'camera_denied' | 'camera_unavailable' | 'model_failed' | 'unknown' }
  | { type: 'pose'; frame: PoseFrame }
  | { type: 'nopose'; t: number };

const MAX_MESSAGE_LENGTH = 16_000;
const ERROR_CODES = new Set(['camera_denied', 'camera_unavailable', 'model_failed', 'unknown']);

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Strictly validates a message coming from the WebView (never trust it blindly). */
export function parseBridgeMessage(data: unknown): BridgeMessage | null {
  if (typeof data !== 'string' || data.length > MAX_MESSAGE_LENGTH) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const msg = raw as Record<string, unknown>;
  switch (msg.type) {
    case 'ready':
      return { type: 'ready' };
    case 'error':
      return { type: 'error', code: typeof msg.code === 'string' && ERROR_CODES.has(msg.code) ? (msg.code as 'unknown') : 'unknown' };
    case 'nopose':
      return finite(msg.t) ? { type: 'nopose', t: msg.t } : null;
    case 'pose': {
      if (!finite(msg.t) || !finite(msg.aspect) || msg.aspect <= 0 || msg.aspect > 10) return null;
      if (!Array.isArray(msg.lm) || msg.lm.length !== LANDMARK_COUNT) return null;
      const landmarks: Landmark[] = [];
      for (const item of msg.lm) {
        if (!Array.isArray(item) || item.length !== 3) return null;
        const [x, y, v] = item as unknown[];
        if (!finite(x) || !finite(y) || !finite(v) || Math.abs(x) > 5 || Math.abs(y) > 5) return null;
        landmarks.push({ x, y, v: Math.min(1, Math.max(0, v)) });
      }
      return { type: 'pose', frame: { t: msg.t, aspect: msg.aspect, landmarks } };
    }
    default:
      return null;
  }
}
