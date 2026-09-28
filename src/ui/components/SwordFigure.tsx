import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Blade colours for each sword of the shop, weakest first. */
const BLADES = [
  ['#b9a58c', '#8a7a64', '#5e5040'], // rusty
  ['#e4e6ea', '#b4b8c0', '#80858e'], // iron
  ['#f4f6fa', '#c9d0dc', '#8e98aa'], // steel
  ['#fff8e6', '#d8d2c0', '#9a9280'], // knight
  ['#d6f0ff', '#8ec8ee', '#4a86b0'], // runed
  ['#fffdf2', '#e6dcc0', '#b0a078'], // dragonbone
  ['#fff2c4', '#ffc24a', '#d0781a'], // sunforged
  ['#efe6ff', '#b69cff', '#6a4ad0'], // starfall
  ['#e6fff6', '#7af0c8', '#1aa07a'], // eternal
];

/** A sword drawn with simple shapes. Points up, 1:3 ratio. `tier` = index in the shop, `glow` = optional aura colour. */
export function SwordFigure({ size = 120, tier = 0, glow }: { size?: number; tier?: number; glow?: string }) {
  const blade = BLADES[Math.min(Math.max(tier, 0), BLADES.length - 1)] ?? BLADES[0]!;
  const id = `blade-${tier}`;
  return (
    <Svg width={size / 3} height={size} viewBox="0 0 40 120">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={blade[0]} />
          <Stop offset="0.5" stopColor={blade[1]} />
          <Stop offset="1" stopColor={blade[2]} />
        </LinearGradient>
        <LinearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f0cf72" />
          <Stop offset="1" stopColor="#8c6a1f" />
        </LinearGradient>
        {glow ? (
          <RadialGradient id={`${id}-glow-${glow.slice(1)}`} cx="50%" cy="45%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={glow} stopOpacity={0.85} />
            <Stop offset="0.6" stopColor={glow} stopOpacity={0.35} />
            <Stop offset="1" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
        ) : null}
      </Defs>
      {glow ? <Ellipse cx={20} cy={52} rx={20} ry={58} fill={`url(#${id}-glow-${glow.slice(1)})`} /> : null}
      <G>
        <Path d="M20 2 L27 14 L27 84 L13 84 L13 14 Z" fill={`url(#${id})`} stroke="#5d6168" strokeWidth={1} />
        <Path d="M20 8 L20 82" stroke={blade[2]} strokeWidth={1} />
        {tier >= 4 ? <Path d="M20 24 L22 30 L20 36 L18 30 Z M20 50 L22 56 L20 62 L18 56 Z" fill={blade[1]} opacity={0.9} /> : null}
        <Rect x={3} y={84} width={34} height={6} rx={3} fill="url(#gold)" />
        <Rect x={16} y={90} width={8} height={20} rx={2} fill="#5a3a22" />
        <Path d="M16 94 L24 97 M16 100 L24 103 M16 106 L24 109" stroke="#3b2414" strokeWidth={1} />
        <Circle cx={20} cy={114} r={5} fill={tier >= 6 ? blade[1] : 'url(#gold)'} />
      </G>
    </Svg>
  );
}
