import { skeleton } from '../../pose/__tests__/helpers';
import { CameraRepSource } from '../CameraRepSource';
import type { RepEvent } from '../RepSource';

const poseMessage = (t: number, elbow: number) => {
  const frame = skeleton(t, { elbow });
  return JSON.stringify({ type: 'pose', t, aspect: 1, lm: frame.landmarks.map((l) => [l.x, l.y, l.v]) });
};

describe('CameraRepSource', () => {
  it('emits reps detected from camera messages', () => {
    const source = new CameraRepSource('pushup');
    const events: RepEvent[] = [];
    source.subscribe((e) => events.push(e));
    source.handleMessage('{"type":"ready"}');
    let t = 0;
    for (const angle of [170, 170, 170, 90, 90, 90, 170, 170, 170]) source.handleMessage(poseMessage((t += 66), angle));
    expect(events).toEqual([{ type: 'reps', count: 1, burst: false }]);
    expect(source.getState()).toMatchObject({ stage: 'running', body: { tracking: true } });
  });

  it('reports camera errors and ignores junk', () => {
    const source = new CameraRepSource('squat');
    const states: string[] = [];
    source.onState((s) => states.push(s.stage));
    source.handleMessage('{"type":"hack"}');
    source.handleMessage('{"type":"error","code":"camera_denied"}');
    expect(states).toEqual(['error']);
    expect(source.getState()).toEqual({ stage: 'error', code: 'camera_denied' });
  });
});
