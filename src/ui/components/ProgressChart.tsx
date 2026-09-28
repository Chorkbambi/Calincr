import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, spacing } from '../theme';

/** Single-series mark colour: validated for contrast and lightness on the dark stone surface. */
const MARK = '#b8872c';
const HEIGHT = 150;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

export interface ChartPoint {
  label: string;
  /** Long label for the tooltip and screen readers. */
  title: string;
  value: number;
}

/** Rounded "nice" maximum for the y axis (its half is a round number too). */
function niceMax(value: number): number {
  if (value <= 2) return 2;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

/** Bar with a 4 px rounded top, anchored flat on the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/**
 * One-series chart (bars for weekly volume, line for best set) drawn with react-native-svg.
 * Tap a week to read its value; the whole series is also given to screen readers.
 */
export function ProgressChart({
  points,
  kind,
  format,
}: {
  points: ChartPoint[];
  kind: 'bar' | 'line';
  format: (value: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = points.length > 0 ? plotW / points.length : 0;
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const active = selected !== null ? points[selected] : null;
  const summary = points.map((p) => `${p.title}: ${format(p.value)}`).join('. ');
  // Line: only weeks with training are joined; empty weeks leave gaps.
  const segments: string[] = [];
  if (kind === 'line') {
    let current = '';
    points.forEach((p, i) => {
      if (p.value > 0) current += `${current ? 'L' : 'M'}${x(i)},${y(p.value)} `;
      else if (current) {
        segments.push(current);
        current = '';
      }
    });
    if (current) segments.push(current);
  }

  return (
    <View accessible accessibilityLabel={summary}>
      <Text style={styles.tooltip}>{active ? `${active.title}: ${format(active.value)}` : 'Tap a week to see its value.'}</Text>
      <View onLayout={onLayout} style={{ height: HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {ticks.map((t) => (
              <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={t === 0 ? 1 : 0.5} strokeDasharray={t === 0 ? undefined : '3 4'} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`l${t}`} x={PAD.left - 6} y={y(t) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {Math.round(t)}
              </SvgText>
            ))}
            {points.map((p, i) =>
              i % 3 === (points.length - 1) % 3 ? (
                <SvgText key={`x${i}`} x={x(i)} y={HEIGHT - 6} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                  {p.label}
                </SvgText>
              ) : null,
            )}
            {kind === 'bar' &&
              points.map((p, i) => {
                if (p.value <= 0) return null;
                const w = Math.max(2, Math.min(18, slot - 2));
                const top = y(p.value);
                return (
                  <Path key={i} d={barPath(x(i) - w / 2, top, w, PAD.top + plotH - top)} fill={MARK} opacity={selected === null || selected === i ? 1 : 0.45} />
                );
              })}
            {kind === 'line' && (
              <>
                {segments.map((d) => (
                  <Path key={d} d={d} stroke={MARK} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {points.map((p, i) =>
                  p.value > 0 ? (
                    <Circle key={i} cx={x(i)} cy={y(p.value)} r={selected === i ? 5 : 4} fill={MARK} stroke={colors.stone} strokeWidth={2} />
                  ) : null,
                )}
              </>
            )}
            {kind === 'line' && selected !== null && (
              <Line x1={x(selected)} x2={x(selected)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.textMuted} strokeWidth={1} />
            )}
          </Svg>
        )}
        {/* Hit targets: one full-height column per week, wider than the marks. */}
        <View style={[StyleSheet.absoluteFill, styles.hits, { left: PAD.left, right: PAD.right }]}>
          {points.map((p, i) => (
            <Pressable key={i} style={styles.hit} onPress={() => setSelected(selected === i ? null : i)} accessibilityLabel={`${p.title}: ${format(p.value)}`} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: { color: colors.text, fontSize: 13, marginBottom: spacing.xs, minHeight: 18 },
  hits: { flexDirection: 'row' },
  hit: { flex: 1 },
});
