import type { ExerciseId } from '../game';

/** 2D point in the animation viewBox (200 × 140, ground at y = 125). */
export type Pt = readonly [number, number];

/** A side-view stick figure. `leg2` = the other leg when it does something different. */
export interface Pose {
  head: Pt;
  shoulder: Pt;
  elbow: Pt;
  hand: Pt;
  hip: Pt;
  knee: Pt;
  foot: Pt;
  toe?: Pt;
  knee2?: Pt;
  foot2?: Pt;
}

export type Prop =
  | { kind: 'wall'; x: number }
  | { kind: 'bench'; x: number; w: number; top: number }
  | { kind: 'bar'; x1: number; x2: number; y: number }
  | { kind: 'table'; x: number; w: number; top: number }
  | { kind: 'door'; x: number };

export interface ExerciseAnimation {
  /** Start pose and end pose; the figure moves back and forth between them. */
  from: Pose;
  to: Pose;
  props?: Prop[];
  /** Duration of one full rep (there and back), ms. */
  periodMs?: number;
}

const PUSHUP: ExerciseAnimation = {
  from: { foot: [40, 125], knee: [70, 113], hip: [100, 102], shoulder: [150, 88], head: [166, 80], elbow: [150, 106], hand: [150, 125] },
  to: { foot: [40, 125], knee: [70, 118], hip: [100, 113], shoulder: [148, 106], head: [165, 100], elbow: [132, 114], hand: [150, 125] },
};

const KNEE_PUSHUP: ExerciseAnimation = {
  from: { foot: [45, 108], knee: [70, 125], hip: [100, 110], shoulder: [145, 92], head: [161, 84], elbow: [145, 108], hand: [145, 125] },
  to: { foot: [45, 108], knee: [70, 125], hip: [100, 116], shoulder: [143, 108], head: [160, 102], elbow: [128, 115], hand: [145, 125] },
};

const WALL_PUSHUP: ExerciseAnimation = {
  props: [{ kind: 'wall', x: 160 }],
  from: { foot: [85, 125], knee: [90, 104], hip: [96, 83], shoulder: [118, 50], head: [126, 38], elbow: [138, 51], hand: [158, 52] },
  to: { foot: [85, 125], knee: [92, 104], hip: [103, 82], shoulder: [136, 48], head: [145, 37], elbow: [144, 66], hand: [158, 52] },
};

const PIKE: ExerciseAnimation = {
  from: { foot: [60, 125], knee: [75, 100], hip: [95, 70], shoulder: [127, 96], head: [136, 108], elbow: [133, 111], hand: [138, 125] },
  to: { foot: [60, 125], knee: [75, 100], hip: [95, 74], shoulder: [132, 108], head: [142, 120], elbow: [122, 114], hand: [138, 125] },
};

const ELEVATED_PIKE: ExerciseAnimation = {
  props: [{ kind: 'bench', x: 35, w: 35, top: 100 }],
  from: { foot: [55, 100], knee: [72, 85], hip: [95, 68], shoulder: [118, 94], head: [124, 107], elbow: [123, 110], hand: [126, 125] },
  to: { foot: [55, 100], knee: [72, 85], hip: [97, 72], shoulder: [120, 108], head: [128, 120], elbow: [110, 113], hand: [126, 125] },
};

const BENCH_DIP: ExerciseAnimation = {
  props: [{ kind: 'bench', x: 60, w: 30, top: 95 }],
  from: { hand: [90, 95], elbow: [94, 80], shoulder: [96, 65], head: [100, 52], hip: [100, 96], knee: [135, 106], foot: [170, 120] },
  to: { hand: [90, 95], elbow: [78, 84], shoulder: [97, 82], head: [101, 69], hip: [101, 113], knee: [135, 112], foot: [170, 122] },
};

const CHAIR_DIP: ExerciseAnimation = {
  props: [{ kind: 'bench', x: 60, w: 30, top: 95 }],
  from: { hand: [90, 95], elbow: [94, 80], shoulder: [96, 65], head: [100, 52], hip: [100, 96], knee: [132, 98], foot: [132, 125] },
  to: { hand: [90, 95], elbow: [78, 84], shoulder: [97, 82], head: [101, 69], hip: [101, 113], knee: [132, 106], foot: [132, 125] },
};

const BAR_DIP: ExerciseAnimation = {
  props: [{ kind: 'bar', x1: 80, x2: 125, y: 60 }],
  from: { hand: [100, 60], elbow: [100, 48], shoulder: [100, 35], head: [104, 22], hip: [98, 75], knee: [96, 95], foot: [110, 106] },
  to: { hand: [100, 60], elbow: [86, 55], shoulder: [105, 52], head: [110, 39], hip: [100, 90], knee: [98, 108], foot: [112, 118] },
};

const PULLUP: ExerciseAnimation = {
  props: [{ kind: 'bar', x1: 60, x2: 140, y: 20 }],
  from: { hand: [100, 20], elbow: [100, 33], shoulder: [100, 46], head: [103, 36], hip: [100, 86], knee: [100, 106], foot: [100, 124] },
  to: { hand: [100, 20], elbow: [86, 32], shoulder: [100, 30], head: [103, 14], hip: [100, 70], knee: [100, 90], foot: [100, 108] },
};

const INVERTED_ROW: ExerciseAnimation = {
  props: [{ kind: 'table', x: 110, w: 60, top: 70 }],
  from: { hand: [128, 70], elbow: [127, 85], shoulder: [126, 100], head: [142, 97], hip: [95, 110], knee: [68, 118], foot: [40, 125] },
  to: { hand: [128, 70], elbow: [110, 80], shoulder: [126, 80], head: [142, 76], hip: [93, 100], knee: [66, 113], foot: [40, 125] },
};

const DOOR_ROW: ExerciseAnimation = {
  props: [{ kind: 'door', x: 150 }],
  from: { hand: [150, 60], elbow: [126, 56], shoulder: [102, 52], head: [94, 40], hip: [116, 82], knee: [126, 104], foot: [136, 125] },
  to: { hand: [150, 60], elbow: [114, 66], shoulder: [120, 52], head: [112, 40], hip: [126, 82], knee: [130, 104], foot: [136, 125] },
};

const SQUAT: ExerciseAnimation = {
  from: { foot: [100, 125], toe: [112, 125], knee: [102, 100], hip: [100, 75], shoulder: [100, 40], head: [102, 27], elbow: [112, 52], hand: [126, 54] },
  to: { foot: [100, 125], toe: [112, 125], knee: [120, 102], hip: [90, 98], shoulder: [106, 68], head: [112, 56], elbow: [120, 78], hand: [136, 76] },
};

const CHAIR_SQUAT: ExerciseAnimation = { ...SQUAT, props: [{ kind: 'bench', x: 62, w: 30, top: 100 }] };

const JUMP_SQUAT: ExerciseAnimation = {
  from: SQUAT.to,
  to: { foot: [100, 108], toe: [110, 112], knee: [101, 86], hip: [100, 60], shoulder: [100, 26], head: [101, 13], elbow: [96, 38], hand: [94, 22] },
  periodMs: 1600,
};

const LUNGE: ExerciseAnimation = {
  from: { foot: [125, 125], knee: [116, 100], hip: [100, 76], shoulder: [100, 40], head: [102, 27], elbow: [100, 58], hand: [100, 76], knee2: [86, 100], foot2: [68, 122] },
  to: { foot: [125, 125], knee: [128, 100], hip: [100, 96], shoulder: [100, 60], head: [102, 47], elbow: [100, 78], hand: [100, 94], knee2: [88, 122], foot2: [66, 124] },
};

const BULGARIAN: ExerciseAnimation = {
  props: [{ kind: 'bench', x: 40, w: 30, top: 96 }],
  from: { foot: [128, 125], knee: [120, 100], hip: [104, 74], shoulder: [106, 38], head: [108, 25], elbow: [106, 56], hand: [106, 74], knee2: [88, 102], foot2: [62, 96] },
  to: { foot: [128, 125], knee: [132, 100], hip: [104, 96], shoulder: [108, 60], head: [110, 47], elbow: [108, 78], hand: [108, 96], knee2: [92, 120], foot2: [62, 96] },
};

const PISTOL: ExerciseAnimation = {
  from: { foot: [100, 125], toe: [112, 125], knee: [101, 100], hip: [100, 75], shoulder: [100, 40], head: [102, 27], elbow: [112, 52], hand: [128, 52], knee2: [112, 98], foot2: [122, 118] },
  to: { foot: [100, 125], toe: [112, 125], knee: [118, 104], hip: [90, 112], shoulder: [108, 80], head: [116, 69], elbow: [124, 86], hand: [142, 86], knee2: [118, 110], foot2: [148, 106] },
};

const GLUTE_BRIDGE: ExerciseAnimation = {
  from: { head: [40, 116], shoulder: [56, 120], elbow: [70, 123], hand: [84, 123], hip: [95, 121], knee: [120, 100], foot: [134, 125] },
  to: { head: [40, 116], shoulder: [56, 120], elbow: [70, 123], hand: [84, 123], hip: [95, 100], knee: [122, 92], foot: [134, 125] },
};

const SINGLE_LEG_BRIDGE: ExerciseAnimation = {
  from: { ...GLUTE_BRIDGE.from, knee2: [118, 104], foot2: [140, 92] },
  to: { ...GLUTE_BRIDGE.to, knee2: [122, 88], foot2: [148, 76] },
};

const CALF_RAISE: ExerciseAnimation = {
  props: [{ kind: 'wall', x: 150 }],
  from: { foot: [100, 121], toe: [113, 125], knee: [100, 98], hip: [100, 74], shoulder: [100, 40], head: [102, 27], elbow: [122, 48], hand: [148, 52] },
  to: { foot: [100, 110], toe: [113, 125], knee: [100, 87], hip: [100, 63], shoulder: [100, 29], head: [102, 16], elbow: [123, 42], hand: [148, 48] },
  periodMs: 1800,
};

const CRUNCH: ExerciseAnimation = {
  from: { head: [42, 113], shoulder: [58, 118], elbow: [52, 106], hand: [44, 105], hip: [95, 120], knee: [116, 100], foot: [134, 125] },
  to: { head: [58, 94], shoulder: [70, 104], elbow: [66, 92], hand: [58, 90], hip: [95, 120], knee: [116, 100], foot: [134, 125] },
  periodMs: 1800,
};

const LEG_RAISE: ExerciseAnimation = {
  from: { head: [40, 116], shoulder: [56, 120], elbow: [70, 123], hand: [84, 123], hip: [95, 121], knee: [125, 120], foot: [155, 119] },
  to: { head: [40, 116], shoulder: [56, 120], elbow: [70, 123], hand: [84, 123], hip: [95, 121], knee: [103, 92], foot: [108, 62] },
};

const HANGING_LEG_RAISE: ExerciseAnimation = {
  props: [{ kind: 'bar', x1: 60, x2: 140, y: 20 }],
  from: { hand: [100, 20], elbow: [100, 33], shoulder: [100, 46], head: [104, 36], hip: [100, 86], knee: [100, 106], foot: [100, 124] },
  to: { hand: [100, 20], elbow: [100, 33], shoulder: [99, 46], head: [103, 36], hip: [98, 86], knee: [126, 82], foot: [152, 80] },
};

const PLANK: ExerciseAnimation = {
  from: { foot: [40, 122], knee: [70, 115], hip: [100, 109], shoulder: [150, 104], head: [166, 99], elbow: [150, 125], hand: [172, 125] },
  to: { foot: [40, 122], knee: [70, 115], hip: [100, 108], shoulder: [150, 103], head: [166, 98], elbow: [150, 125], hand: [172, 125] },
  periodMs: 3000,
};

const KNEE_PLANK: ExerciseAnimation = {
  from: { foot: [45, 110], knee: [72, 125], hip: [102, 112], shoulder: [150, 104], head: [166, 99], elbow: [150, 125], hand: [172, 125] },
  to: { foot: [45, 110], knee: [72, 125], hip: [102, 111], shoulder: [150, 103], head: [166, 98], elbow: [150, 125], hand: [172, 125] },
  periodMs: 3000,
};

const HOLLOW: ExerciseAnimation = {
  from: { head: [42, 106], shoulder: [58, 113], elbow: [40, 105], hand: [22, 99], hip: [95, 122], knee: [125, 113], foot: [155, 104] },
  to: { head: [42, 104], shoulder: [58, 112], elbow: [40, 103], hand: [22, 97], hip: [95, 122], knee: [125, 112], foot: [155, 102] },
  periodMs: 3000,
};

const SUPERMAN: ExerciseAnimation = {
  from: { head: [160, 117], shoulder: [145, 121], elbow: [166, 122], hand: [186, 122], hip: [100, 122], knee: [70, 123], foot: [40, 123] },
  to: { head: [162, 101], shoulder: [146, 110], elbow: [166, 104], hand: [186, 98], hip: [100, 121], knee: [70, 115], foot: [40, 107] },
  periodMs: 2000,
};

const NORDIC: ExerciseAnimation = {
  props: [{ kind: 'bench', x: 40, w: 30, top: 112 }],
  from: { foot: [60, 118], knee: [90, 125], hip: [93, 95], shoulder: [97, 60], head: [100, 47], elbow: [104, 76], hand: [110, 86] },
  to: { foot: [60, 118], knee: [90, 125], hip: [116, 106], shoulder: [148, 88], head: [161, 81], elbow: [154, 103], hand: [160, 116] },
  periodMs: 3200,
};

export const EXERCISE_ANIMATIONS: Record<ExerciseId, ExerciseAnimation> = {
  wall_pushup: WALL_PUSHUP,
  knee_pushup: KNEE_PUSHUP,
  chair_dip: CHAIR_DIP,
  door_row: DOOR_ROW,
  superman: SUPERMAN,
  chair_squat: CHAIR_SQUAT,
  glute_bridge: GLUTE_BRIDGE,
  calf_raise: CALF_RAISE,
  crunch: CRUNCH,
  knee_plank: KNEE_PLANK,
  pushup: PUSHUP,
  pike_pushup: PIKE,
  bench_dip: BENCH_DIP,
  inverted_row: INVERTED_ROW,
  squat: SQUAT,
  lunge: LUNGE,
  single_leg_bridge: SINGLE_LEG_BRIDGE,
  single_leg_calf_raise: CALF_RAISE,
  leg_raise: LEG_RAISE,
  plank: PLANK,
  pullup: PULLUP,
  chinup: PULLUP,
  dip: BAR_DIP,
  diamond_pushup: PUSHUP,
  elevated_pike_pushup: ELEVATED_PIKE,
  pistol_squat: PISTOL,
  bulgarian_split_squat: BULGARIAN,
  jump_squat: JUMP_SQUAT,
  nordic_curl: NORDIC,
  hanging_leg_raise: HANGING_LEG_RAISE,
  hollow_hold: HOLLOW,
};

/** Smooth back-and-forth progress (0 → 1 → 0) for a time in ms. */
export function pingPong(timeMs: number, periodMs: number): number {
  const phase = (timeMs % periodMs) / periodMs;
  const linear = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return (1 - Math.cos(linear * Math.PI)) / 2;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Pose between `from` and `to` at progress t (0-1). */
export function poseAt(anim: ExerciseAnimation, t: number): Pose {
  const { from, to } = anim;
  const opt = (a?: Pt, b?: Pt) => (a && b ? lerp(a, b, t) : a ?? b);
  return {
    head: lerp(from.head, to.head, t),
    shoulder: lerp(from.shoulder, to.shoulder, t),
    elbow: lerp(from.elbow, to.elbow, t),
    hand: lerp(from.hand, to.hand, t),
    hip: lerp(from.hip, to.hip, t),
    knee: lerp(from.knee, to.knee, t),
    foot: lerp(from.foot, to.foot, t),
    toe: opt(from.toe, to.toe),
    knee2: opt(from.knee2, to.knee2),
    foot2: opt(from.foot2, to.foot2),
  };
}
