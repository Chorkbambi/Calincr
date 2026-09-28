import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabIconName = 'combat' | 'character' | 'shop' | 'calendar' | 'settings';

/** Hand-drawn line icons for the bottom tabs. */
export function TabIcon({ name, color, size = 24 }: { name: TabIconName; color: ColorValue; size?: number }) {
  const stroke = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'combat' ? (
        <>
          <Path d="M14.5 3.5 L20.5 3.5 L20.5 9.5 L10 20 L4 14 Z" {...stroke} />
          <Path d="M3 21 L6.5 17.5 M5 12 L12 19" {...stroke} />
        </>
      ) : null}
      {name === 'character' ? (
        <>
          <Path d="M5 10 Q5 3 12 3 Q19 3 19 10 L19 14 L5 14 Z" {...stroke} />
          <Path d="M12 3 L12 14 M8 9 L16 9" {...stroke} />
          <Path d="M7 14 L7 21 L17 21 L17 14" {...stroke} />
        </>
      ) : null}
      {name === 'shop' ? (
        <>
          <Path d="M4 9 L20 9 L18.5 20 L5.5 20 Z" {...stroke} />
          <Path d="M8.5 9 Q8.5 3.5 12 3.5 Q15.5 3.5 15.5 9" {...stroke} />
          <Circle cx={12} cy={14.5} r={2} fill={color} />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Rect x={3.5} y={5} width={17} height={15} rx={2} {...stroke} />
          <Path d="M3.5 10 L20.5 10 M8 3 L8 7 M16 3 L16 7" {...stroke} />
          <Circle cx={12} cy={15} r={1.6} fill={color} />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Circle cx={12} cy={12} r={3.2} {...stroke} />
          <Path
            d="M12 2.5 L12 5 M12 19 L12 21.5 M2.5 12 L5 12 M19 12 L21.5 12 M5.3 5.3 L7.1 7.1 M16.9 16.9 L18.7 18.7 M5.3 18.7 L7.1 16.9 M16.9 7.1 L18.7 5.3"
            {...stroke}
          />
        </>
      ) : null}
    </Svg>
  );
}
