import { EXERCISES } from '../../game/config';
import { describeBodyParts, missingBodyParts, requiredBodyParts } from '../visibility';
import { skeleton } from './helpers';

describe('body parts to keep in view', () => {
  it('lists the parts each exercise needs', () => {
    expect(requiredBodyParts('pushup')).toEqual(['shoulder', 'elbow', 'wrist']);
    expect(requiredBodyParts('squat')).toEqual(['hip', 'knee', 'ankle']);
    expect(requiredBodyParts('plank')).toEqual(['shoulder', 'hip', 'knee', 'ankle']);
    for (const e of EXERCISES) expect(requiredBodyParts(e.id).length).toBeGreaterThan(0);
  });

  it('describes them in plain English', () => {
    expect(describeBodyParts(['shoulder', 'elbow', 'wrist'])).toBe('shoulders, elbows and wrists');
    expect(describeBodyParts(['hip'])).toBe('hips');
  });

  it('reports what the camera cannot see', () => {
    const frame = skeleton(0);
    expect(missingBodyParts(frame, 'pushup')).toEqual([]);
    frame.landmarks = frame.landmarks.map((l, i) => (i === 15 || i === 16 ? { ...l, v: 0.1 } : l)); // both wrists hidden
    expect(missingBodyParts(frame, 'pushup')).toEqual(['wrist']);
    expect(missingBodyParts(frame, 'squat')).toEqual([]);
  });
});
