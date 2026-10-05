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

  it('starts each set from a clean position', () => {
    const source = new CameraRepSource('pushup');
    const events: RepEvent[] = [];
    source.subscribe((e) => events.push(e));
    source.handleMessage('{"type":"ready"}');
    let t = 0;
    // Down at the end of the rest, then the set starts: coming back up is not a rep.
    for (const angle of [170, 170, 170, 90, 90, 90]) source.handleMessage(poseMessage((t += 66), angle));
    source.endSet();
    for (const angle of [170, 170, 170]) source.handleMessage(poseMessage((t += 66), angle));
    expect(events).toEqual([]);
    for (const angle of [90, 90, 90, 170, 170, 170]) source.handleMessage(poseMessage((t += 66), angle));
    expect(events).toEqual([{ type: 'reps', count: 1, burst: false }]);
  });

  it('calibrates without counting reps, then uses the player thresholds', () => {
    const source = new CameraRepSource('pushup');
    const events: RepEvent[] = [];
    source.subscribe((e) => events.push(e));
    source.handleMessage('{"type":"ready"}');
    source.startCalibration();
    let t = 0;
    // Shallow push-ups (140° ↔ 105°): the default thresholds would never count them.
    const cycle = [140, 132, 124, 116, 108, 105, 108, 116, 124, 132, 140];
    for (let r = 0; r < 3; r++) for (const a of cycle) source.handleMessage(poseMessage((t += 150), a));
    expect(events).toEqual([]);
    const result = source.finishCalibration();
    if (!('tracker' in result)) throw new Error('calibration failed');
    source.setCalibrations({ pushup: result.tracker });
    for (let r = 0; r < 2; r++) for (const a of cycle) for (let k = 0; k < 2; k++) source.handleMessage(poseMessage((t += 100), a));
    expect(events.filter((e) => e.type === 'reps').length).toBeGreaterThanOrEqual(1);
  });
});
