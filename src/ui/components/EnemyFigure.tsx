import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

const PALETTES = [
  { body: '#7b8a4a', dark: '#4c5a2a', eye: '#f0cf72' }, // moss
  { body: '#8a5a44', dark: '#5a3424', eye: '#ffe08a' }, // clay
  { body: '#5a6f8a', dark: '#34445a', eye: '#b8f0ff' }, // frost
  { body: '#8a4a6a', dark: '#5a2a44', eye: '#ffd0f0' }, // plum
  { body: '#6a6a6a', dark: '#3a3a3a', eye: '#ff8a5a' }, // stone
  { body: '#a0402f', dark: '#62201a', eye: '#ffd24a' }, // ember
  { body: '#3f7f78', dark: '#1f4f4a', eye: '#e0ff9a' }, // teal
];

const BODIES = [
  // round blob
  'M100 48 C150 48 172 90 170 130 C168 168 140 184 100 184 C60 184 32 168 30 130 C28 90 50 48 100 48 Z',
  // tall brute
  'M100 36 C136 36 150 70 152 110 C156 150 146 184 100 184 C54 184 44 150 48 110 C50 70 64 36 100 36 Z',
  // wide beast
  'M100 64 C160 60 186 100 184 138 C182 172 150 184 100 184 C50 184 18 172 16 138 C14 100 40 60 100 64 Z',
];

/** Original monster drawn from simple shapes; `look` varies it, bosses are bigger and crowned. */
export function EnemyFigure({ look, boss = false, size = 180 }: { look: number; boss?: boolean; size?: number }) {
  const palette = PALETTES[look % PALETTES.length] ?? PALETTES[0]!;
  const body = BODIES[Math.floor(look / 2) % BODIES.length] ?? BODIES[0]!;
  const horns = look % 3 !== 1;
  const oneEye = look % 4 === 3;
  const id = `enemy-${look % PALETTES.length}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={id} cx="45%" cy="35%" r="70%">
          <Stop offset="0" stopColor={palette.body} />
          <Stop offset="1" stopColor={palette.dark} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={188} rx={62} ry={8} fill="#000" opacity={0.35} />
      {horns ? (
        <G fill="#e8dcc0" stroke="#8c7a5a" strokeWidth={2}>
          <Path d="M58 70 Q30 40 40 12 Q58 42 78 58 Z" />
          <Path d="M142 70 Q170 40 160 12 Q142 42 122 58 Z" />
        </G>
      ) : (
        <G fill={palette.dark}>
          <Path d="M60 64 L52 40 L72 56 Z" />
          <Path d="M100 50 L100 26 L112 50 Z" />
          <Path d="M140 64 L148 40 L128 56 Z" />
        </G>
      )}
      <Path d={body} fill={`url(#${id})`} stroke={palette.dark} strokeWidth={3} />
      <Path d="M34 128 Q14 140 18 164 Q34 150 44 146 Z" fill={palette.dark} />
      <Path d="M166 128 Q186 140 182 164 Q166 150 156 146 Z" fill={palette.dark} />
      {boss ? (
        <Path d="M68 44 L76 14 L90 34 L100 6 L110 34 L124 14 L132 44 Z" fill="#d4a73c" stroke="#8c6a1f" strokeWidth={2} />
      ) : null}
      {oneEye ? (
        <G>
          <Circle cx={100} cy={100} r={20} fill="#1a120c" />
          <Circle cx={100} cy={100} r={12} fill={palette.eye} />
          <Circle cx={104} cy={96} r={4} fill="#1a120c" />
        </G>
      ) : (
        <G>
          <Path d="M62 92 L90 100 L84 112 L64 106 Z" fill="#1a120c" />
          <Path d="M138 92 L110 100 L116 112 L136 106 Z" fill="#1a120c" />
          <Circle cx={78} cy={104} r={4} fill={palette.eye} />
          <Circle cx={122} cy={104} r={4} fill={palette.eye} />
        </G>
      )}
      <Path d="M70 142 Q100 162 130 142 L126 150 Q100 170 74 150 Z" fill="#1a120c" />
      <Path d="M80 146 L84 156 L88 148 M112 148 L116 156 L120 146" fill="#e8dcc0" />
    </Svg>
  );
}
