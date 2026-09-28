import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Circle } from 'react-native-svg';

/** Starter sword, drawn with simple shapes. Points up, 1:3 ratio. */
export function SwordFigure({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size / 3} height={size} viewBox="0 0 40 120">
      <Defs>
        <LinearGradient id="blade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#f4f1ea" />
          <Stop offset="0.5" stopColor="#c9ccd1" />
          <Stop offset="1" stopColor="#8e939b" />
        </LinearGradient>
        <LinearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f0cf72" />
          <Stop offset="1" stopColor="#8c6a1f" />
        </LinearGradient>
      </Defs>
      <G>
        <Path d="M20 2 L27 14 L27 84 L13 84 L13 14 Z" fill="url(#blade)" stroke="#5d6168" strokeWidth={1} />
        <Path d="M20 8 L20 82" stroke="#7d828a" strokeWidth={1} />
        <Rect x={3} y={84} width={34} height={6} rx={3} fill="url(#gold)" />
        <Rect x={16} y={90} width={8} height={20} rx={2} fill="#5a3a22" />
        <Path d="M16 94 L24 97 M16 100 L24 103 M16 106 L24 109" stroke="#3b2414" strokeWidth={1} />
        <Circle cx={20} cy={114} r={5} fill="url(#gold)" />
      </G>
    </Svg>
  );
}
