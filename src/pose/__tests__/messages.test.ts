import { parseBridgeMessage } from '../messages';

const lm = Array.from({ length: 33 }, () => [0.5, 0.5, 0.9]);

describe('parseBridgeMessage', () => {
  it('accepts well-formed messages', () => {
    expect(parseBridgeMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseBridgeMessage('{"type":"error","code":"camera_denied"}')).toEqual({ type: 'error', code: 'camera_denied' });
    const pose = parseBridgeMessage(JSON.stringify({ type: 'pose', t: 12, aspect: 0.75, lm }));
    expect(pose?.type).toBe('pose');
    if (pose?.type === 'pose') expect(pose.frame.landmarks).toHaveLength(33);
  });

  it('rejects anything malformed or unexpected', () => {
    expect(parseBridgeMessage('not json')).toBeNull();
    expect(parseBridgeMessage(42)).toBeNull();
    expect(parseBridgeMessage('{"type":"navigate","url":"https://evil.example"}')).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ type: 'pose', t: 1, aspect: 1, lm: lm.slice(1) }))).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ type: 'pose', t: 1, aspect: 1, lm: [...lm.slice(1), ['a', 1, 1]] }))).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ type: 'pose', t: 1, aspect: -1, lm }))).toBeNull();
    expect(parseBridgeMessage('x'.repeat(20_000))).toBeNull();
  });

  it('maps unknown error codes to "unknown"', () => {
    expect(parseBridgeMessage('{"type":"error","code":"<script>"}')).toEqual({ type: 'error', code: 'unknown' });
  });
});
