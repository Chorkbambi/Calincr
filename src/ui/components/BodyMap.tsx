import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { MUSCLE_IDS, type MuscleId } from '../../game';
import { colors, fonts } from '../theme';

const SKIN = '#4a3b2c';
const OUTLINE = '#1b1510';

/** Colour from weakest (dull bronze) to strongest (bright gold), relative to the player's own muscles. */
function levelColor(level: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (level - min) / (max - min);
  const stops = ['#6e4a2a', '#9a6a2c', '#c8912f', '#e3b545', '#ffe08a'];
  return stops[Math.min(stops.length - 1, Math.round(t * (stops.length - 1)))] ?? stops[0]!;
}

type Shape = { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } | { kind: 'path'; d: string };

/** Muscle shapes per view (viewBox 120 × 240), mirrored left/right where needed. */
const FRONT: Partial<Record<MuscleId, Shape[]>> = {
  shoulders: [
    { kind: 'ellipse', cx: 34, cy: 52, rx: 10, ry: 9 },
    { kind: 'ellipse', cx: 86, cy: 52, rx: 10, ry: 9 },
  ],
  chest: [
    { kind: 'path', d: 'M42 46 Q52 42 59 45 L59 66 Q48 70 40 63 Z' },
    { kind: 'path', d: 'M78 46 Q68 42 61 45 L61 66 Q72 70 80 63 Z' },
  ],
  biceps: [
    { kind: 'ellipse', cx: 28, cy: 77, rx: 7, ry: 14 },
    { kind: 'ellipse', cx: 92, cy: 77, rx: 7, ry: 14 },
  ],
  abs: [{ kind: 'path', d: 'M48 70 L72 70 L70 112 Q60 118 50 112 Z' }],
  quads: [
    { kind: 'ellipse', cx: 49, cy: 152, rx: 11, ry: 28 },
    { kind: 'ellipse', cx: 71, cy: 152, rx: 11, ry: 28 },
  ],
};

const BACK: Partial<Record<MuscleId, Shape[]>> = {
  shoulders: [
    { kind: 'ellipse', cx: 34, cy: 52, rx: 10, ry: 9 },
    { kind: 'ellipse', cx: 86, cy: 52, rx: 10, ry: 9 },
  ],
  back: [{ kind: 'path', d: 'M42 46 Q60 38 78 46 L76 88 Q60 100 44 88 Z' }],
  triceps: [
    { kind: 'ellipse', cx: 28, cy: 77, rx: 7, ry: 14 },
    { kind: 'ellipse', cx: 92, cy: 77, rx: 7, ry: 14 },
  ],
  glutes: [
    { kind: 'ellipse', cx: 50, cy: 124, rx: 11, ry: 11 },
    { kind: 'ellipse', cx: 70, cy: 124, rx: 11, ry: 11 },
  ],
  hamstrings: [
    { kind: 'ellipse', cx: 49, cy: 160, rx: 10, ry: 22 },
    { kind: 'ellipse', cx: 71, cy: 160, rx: 10, ry: 22 },
  ],
  calves: [
    { kind: 'ellipse', cx: 48, cy: 202, rx: 8, ry: 15 },
    { kind: 'ellipse', cx: 72, cy: 202, rx: 8, ry: 15 },
  ],
};

/** Where each muscle's level number is written. */
const LABELS: Record<MuscleId, { view: 'front' | 'back'; x: number; y: number }> = {
  shoulders: { view: 'front', x: 34, y: 55 },
  chest: { view: 'front', x: 50, y: 59 },
  biceps: { view: 'front', x: 28, y: 80 },
  abs: { view: 'front', x: 60, y: 94 },
  quads: { view: 'front', x: 49, y: 155 },
  back: { view: 'back', x: 60, y: 72 },
  triceps: { view: 'back', x: 28, y: 80 },
  glutes: { view: 'back', x: 50, y: 127 },
  hamstrings: { view: 'back', x: 49, y: 163 },
  calves: { view: 'back', x: 48, y: 205 },
};

function Silhouette() {
  return (
    <G fill={SKIN} stroke={OUTLINE} strokeWidth={1}>
      <Circle cx={60} cy={20} r={13} />
      <Rect x={54} y={31} width={12} height={10} />
      <Path d="M36 44 Q60 36 84 44 L82 112 Q60 122 38 112 Z" />
      <Ellipse cx={22} cy={105} rx={6} ry={15} />
      <Ellipse cx={98} cy={105} rx={6} ry={15} />
      <Path d="M38 110 Q60 124 82 110 L84 128 L36 128 Z" />
      <Rect x={39} y={176} width={20} height={48} rx={8} />
      <Rect x={61} y={176} width={20} height={48} rx={8} />
    </G>
  );
}

function View2D({
  view,
  levels,
  selected,
  onSelect,
}: {
  view: 'front' | 'back';
  levels: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  const shapes = view === 'front' ? FRONT : BACK;
  const values = MUSCLE_IDS.map((m) => levels[m]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 240">
      <Silhouette />
      {(Object.entries(shapes) as [MuscleId, Shape[]][]).map(([muscle, list]) => (
        <G
          key={muscle}
          onPress={() => onSelect(muscle)}
          fill={levelColor(levels[muscle], min, max)}
          stroke={selected === muscle ? '#ffffff' : OUTLINE}
          strokeWidth={selected === muscle ? 2 : 1}
        >
          {list.map((s, i) =>
            s.kind === 'ellipse' ? (
              <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />
            ) : (
              <Path key={i} d={s.d} />
            ),
          )}
        </G>
      ))}
      {MUSCLE_IDS.filter((m) => LABELS[m].view === view).map((m) => (
        <SvgText
          key={m}
          x={LABELS[m].x}
          y={LABELS[m].y}
          fontSize={9}
          fontWeight="bold"
          fill={OUTLINE}
          textAnchor="middle"
          onPress={() => onSelect(m)}
        >
          {levels[m]}
        </SvgText>
      ))}
    </Svg>
  );
}

/** Front and back of the hero, each muscle coloured by its level. Tap a muscle to select it. */
export function BodyMap(props: {
  levels: Record<MuscleId, number>;
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.figure}>
          <View style={styles.canvas}>
            <View2D view="front" {...props} />
          </View>
          <Text style={styles.caption}>Front</Text>
        </View>
        <View style={styles.figure}>
          <View style={styles.canvas}>
            <View2D view="back" {...props} />
          </View>
          <Text style={styles.caption}>Back</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={styles.caption}>Weakest</Text>
        {['#6e4a2a', '#9a6a2c', '#c8912f', '#e3b545', '#ffe08a'].map((c) => (
          <View key={c} style={[styles.legendBox, { backgroundColor: c }]} />
        ))}
        <Text style={styles.caption}>Strongest</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  figure: { width: '46%', alignItems: 'center', gap: 4 },
  canvas: { width: '100%', aspectRatio: 0.5 },
  caption: { color: colors.textMuted, fontFamily: fonts.title, fontSize: 11 },
  legend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8 },
  legendBox: { width: 14, height: 10, borderRadius: 2 },
});
