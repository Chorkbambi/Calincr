import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import type { ExerciseId } from '../../game';
import { EXERCISE_ANIMATIONS, pingPong, poseAt, type Prop, type Pt } from '../exerciseAnimations';
import { colors, radius } from '../theme';

const BODY = colors.parchment;
const FAR = colors.parchmentDark;
const PROP = '#7a6048';

function Limb({ a, b, color = BODY, width = 6 }: { a: Pt; b: Pt; color?: string; width?: number }) {
  return <Line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

function PropShape({ prop }: { prop: Prop }) {
  switch (prop.kind) {
    case 'wall':
      return <Rect x={prop.x} y={10} width={8} height={115} fill={PROP} />;
    case 'door':
      return <Rect x={prop.x} y={20} width={6} height={105} fill={PROP} />;
    case 'bench':
      return (
        <G fill={PROP}>
          <Rect x={prop.x} y={prop.top} width={prop.w} height={5} rx={1} />
          <Rect x={prop.x + 2} y={prop.top} width={4} height={125 - prop.top} />
          <Rect x={prop.x + prop.w - 6} y={prop.top} width={4} height={125 - prop.top} />
        </G>
      );
    case 'table':
      return (
        <G fill={PROP}>
          <Rect x={prop.x} y={prop.top - 4} width={prop.w} height={5} rx={1} />
          <Rect x={prop.x + prop.w - 8} y={prop.top} width={5} height={125 - prop.top} />
        </G>
      );
    case 'bar':
      return <Line x1={prop.x1} y1={prop.y} x2={prop.x2} y2={prop.y} stroke={PROP} strokeWidth={4} strokeLinecap="round" />;
  }
}

/** Looping stick-figure demo of an exercise (original simple drawing). */
export function ExerciseAnimationView({ exerciseId }: { exerciseId: ExerciseId }) {
  const anim = EXERCISE_ANIMATIONS[exerciseId];
  const [now, setNow] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      setNow(Date.now() - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [exerciseId]);

  const p = poseAt(anim, pingPong(now, anim.periodMs ?? 2400));
  return (
    <View style={styles.box}>
      <Svg width="100%" height="100%" viewBox="0 0 200 140">
        <Line x1={10} y1={126} x2={190} y2={126} stroke={colors.border} strokeWidth={2} />
        {anim.props?.map((prop, i) => <PropShape key={i} prop={prop} />)}
        {p.knee2 && p.foot2 ? (
          <G>
            <Limb a={p.hip} b={p.knee2} color={FAR} />
            <Limb a={p.knee2} b={p.foot2} color={FAR} />
          </G>
        ) : null}
        <Limb a={p.hip} b={p.knee} />
        <Limb a={p.knee} b={p.foot} />
        {p.toe ? <Limb a={p.foot} b={p.toe} width={4} /> : null}
        <Limb a={p.shoulder} b={p.hip} width={8} />
        <Limb a={p.shoulder} b={p.elbow} />
        <Limb a={p.elbow} b={p.hand} />
        <Circle cx={p.head[0]} cy={p.head[1]} r={9} fill={BODY} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: 200 / 140,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
