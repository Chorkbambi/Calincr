import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { SceneryId } from '../../game';

interface Palette {
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  ground: string;
  accent: string;
}

const PALETTES: Record<SceneryId, Palette> = {
  meadow: { skyTop: '#3e5f7a', skyBottom: '#c9a86a', far: '#4d6b3c', near: '#3a5530', ground: '#2e4424', accent: '#f0cf72' },
  forest: { skyTop: '#1c2a24', skyBottom: '#4a5a3a', far: '#20362a', near: '#15261d', ground: '#101c15', accent: '#c9d67a' },
  crypt: { skyTop: '#16141c', skyBottom: '#3a3446', far: '#2a2632', near: '#1f1c26', ground: '#141219', accent: '#9aa6ff' },
  desert: { skyTop: '#5a2a1a', skyBottom: '#d9884a', far: '#8a4a2a', near: '#6a3420', ground: '#4a2416', accent: '#ffcf6a' },
  snow: { skyTop: '#3a4a6a', skyBottom: '#b8c8dc', far: '#8a9ab4', near: '#dde6f0', ground: '#eef3f8', accent: '#ffffff' },
  cliffs: { skyTop: '#1e2440', skyBottom: '#5a6488', far: '#3a3f5a', near: '#2a2e44', ground: '#1f2233', accent: '#e8e07a' },
  cavern: { skyTop: '#120a08', skyBottom: '#3a1a10', far: '#2a1410', near: '#1c0e0a', ground: '#140a08', accent: '#ff6a2a' },
  ruins: { skyTop: '#1a1438', skyBottom: '#6a4a8a', far: '#3a2a5a', near: '#2a1f44', ground: '#1f1733', accent: '#f0e0ff' },
};

/** Scenery behind the enemy, one per zone (simple original shapes). */
export function ZoneBackdrop({ scenery }: { scenery: SceneryId }) {
  const p = PALETTES[scenery];
  const id = `sky-${scenery}`;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.skyTop} />
          <Stop offset="1" stopColor={p.skyBottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={400} height={240} fill={`url(#${id})`} />
      <Details scenery={scenery} p={p} />
      <Rect x={0} y={200} width={400} height={40} fill={p.ground} />
      <Rect x={0} y={0} width={400} height={240} fill="#000" opacity={0.18} />
    </Svg>
  );
}

function Details({ scenery, p }: { scenery: SceneryId; p: Palette }) {
  switch (scenery) {
    case 'meadow':
      return (
        <G>
          <Circle cx={320} cy={60} r={22} fill={p.accent} opacity={0.8} />
          <Path d="M0 170 Q80 120 160 160 T320 150 T400 160 L400 240 L0 240 Z" fill={p.far} />
          <Path d="M0 200 Q100 170 200 195 T400 190 L400 240 L0 240 Z" fill={p.near} />
        </G>
      );
    case 'forest':
      return (
        <G>
          {[20, 70, 130, 190, 250, 310, 370].map((x, i) => (
            <Path key={x} d={`M${x} ${200 - (i % 3) * 20} L${x - 28} 205 L${x + 28} 205 Z M${x} ${150 - (i % 3) * 20} L${x - 22} 185 L${x + 22} 185 Z`} fill={i % 2 ? p.far : p.near} />
          ))}
          <Circle cx={60} cy={50} r={12} fill={p.accent} opacity={0.5} />
        </G>
      );
    case 'crypt':
      return (
        <G>
          <Path d="M40 200 L40 90 Q80 50 120 90 L120 200 Z M280 200 L280 90 Q320 50 360 90 L360 200 Z" fill={p.far} />
          {[70, 150, 250, 330].map((x) => (
            <Path key={x} d={`M${x - 10} 205 L${x - 10} 180 Q${x} 168 ${x + 10} 180 L${x + 10} 205 Z`} fill={p.near} />
          ))}
          <Circle cx={200} cy={45} r={16} fill={p.accent} opacity={0.6} />
        </G>
      );
    case 'desert':
      return (
        <G>
          <Circle cx={90} cy={70} r={30} fill={p.accent} opacity={0.85} />
          <Path d="M0 180 Q100 140 200 175 T400 165 L400 240 L0 240 Z" fill={p.far} />
          <Path d="M0 205 Q120 180 240 200 T400 195 L400 240 L0 240 Z" fill={p.near} />
        </G>
      );
    case 'snow':
      return (
        <G>
          <Path d="M0 190 L80 90 L140 160 L210 70 L290 170 L340 110 L400 180 L400 240 L0 240 Z" fill={p.far} />
          <Path d="M210 70 L232 98 L220 96 L210 108 L198 94 L190 96 Z M80 90 L98 112 L86 110 L78 118 L70 108 Z" fill={p.accent} />
          <Path d="M0 205 Q200 185 400 205 L400 240 L0 240 Z" fill={p.near} />
        </G>
      );
    case 'cliffs':
      return (
        <G>
          <Path d="M0 240 L0 110 L60 100 L80 150 L120 140 L120 240 Z M400 240 L400 90 L330 100 L300 160 L280 240 Z" fill={p.far} />
          <Path d="M200 30 L185 70 L200 70 L188 105" stroke={p.accent} strokeWidth={3} fill="none" />
          <Path d="M0 210 Q200 190 400 210 L400 240 L0 240 Z" fill={p.near} />
        </G>
      );
    case 'cavern':
      return (
        <G>
          <Path d="M0 0 L400 0 L400 30 L370 70 L345 25 L310 60 L280 20 L240 55 L200 15 L160 60 L120 25 L85 65 L50 20 L20 55 L0 30 Z" fill={p.near} />
          <Path d="M0 205 Q60 195 100 208 Q200 225 300 200 Q360 190 400 205 L400 240 L0 240 Z" fill={p.accent} opacity={0.35} />
          <Path d="M0 240 L0 150 L40 175 L60 240 Z M400 240 L400 140 L355 180 L340 240 Z" fill={p.far} />
        </G>
      );
    case 'ruins':
      return (
        <G>
          {[30, 90, 150, 210, 270, 330, 370].map((x, i) => (
            <Circle key={x} cx={x} cy={20 + ((i * 37) % 80)} r={1.6} fill={p.accent} />
          ))}
          <Path d="M50 205 L50 110 L70 110 L70 205 Z M110 205 L110 140 L130 130 L130 205 Z M280 205 L280 100 L300 100 L300 205 Z M330 205 L330 150 L350 160 L350 205 Z" fill={p.far} />
          <Path d="M40 110 L80 110 L80 100 L40 100 Z M270 100 L310 100 L310 90 L270 90 Z" fill={p.near} />
        </G>
      );
  }
}
