import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Theme } from '@/constants/Theme';
import { cardShadow } from '@/constants/shadows';
import { formatHours } from '@/utils/stats';

export interface RadialSegment {
  key: string;
  label: string;
  days: number;
  color: string;
}

interface CategoryRadialChartProps {
  title: string;
  color: string;
  percentage: number;
  hasGoal: boolean;
  goalDays: number;
  totalHours: number;
  segments: RadialSegment[];
  size?: number;
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function radialBarPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number
): string {
  if (outerR <= innerR + 0.5) outerR = innerR + 0.5;
  const s = degToRad(startDeg - 90);
  const e = degToRad(endDeg - 90);
  const x1 = cx + innerR * Math.cos(s);
  const y1 = cy + innerR * Math.sin(s);
  const x2 = cx + outerR * Math.cos(s);
  const y2 = cy + outerR * Math.sin(s);
  const x3 = cx + outerR * Math.cos(e);
  const y3 = cy + outerR * Math.sin(e);
  const x4 = cx + innerR * Math.cos(e);
  const y4 = cy + innerR * Math.sin(e);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 ${large} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 ${large} 0 ${x1} ${y1} Z`;
}

function GoalRing({
  cx,
  cy,
  radius,
  strokeWidth,
  percentage,
  color,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  percentage: number;
  color: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={Theme.border}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <G transform={`rotate(-90 ${cx} ${cy})`}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </G>
    </>
  );
}

function ChartSvg({
  size,
  percentage,
  color,
  goalDays,
  segments,
}: {
  size: number;
  percentage: number;
  color: string;
  goalDays: number;
  segments: RadialSegment[];
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outerStroke = 7;
  const outerR = size / 2 - outerStroke / 2 - 2;
  const innerR = size * 0.22;
  const maxBarR = outerR - outerStroke - 4;
  const gap = segments.length > 3 ? 5 : 8;
  const slice = (360 - gap * segments.length) / Math.max(segments.length, 1);
  const totalSubDays = segments.reduce((sum, s) => sum + s.days, 0);
  const barScale = goalDays > 0 ? goalDays : Math.max(totalSubDays, 1);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <GoalRing
        cx={cx}
        cy={cy}
        radius={outerR}
        strokeWidth={outerStroke}
        percentage={percentage}
        color={color}
      />
      {segments.map((seg, i) => {
        const start = i * (slice + gap);
        const end = start + slice;
        const barLen = barScale > 0 ? seg.days / barScale : 0;
        const outerBar = innerR + barLen * (maxBarR - innerR);
        const bgOuter = maxBarR;
        return (
          <G key={seg.key}>
            <Path
              d={radialBarPath(cx, cy, innerR, bgOuter, start + 1, end - 1)}
              fill={Theme.border}
              opacity={0.55}
            />
            <Path
              d={radialBarPath(cx, cy, innerR, outerBar, start + 1, end - 1)}
              fill={seg.color}
            />
          </G>
        );
      })}
    </Svg>
  );
}

function ChartWeb({
  size,
  percentage,
  color,
  goalDays,
  segments,
}: {
  size: number;
  percentage: number;
  color: string;
  goalDays: number;
  segments: RadialSegment[];
}) {
  const safePct = Math.min(Math.max(percentage, 0), 100);
  const totalDays = segments.reduce((s, seg) => s + seg.days, 0);
  const stops: string[] = [];
  let cursor = 0;
  if (totalDays === 0) {
    stops.push(`${Theme.border} 0deg 360deg`);
  } else {
    segments.forEach((seg) => {
      const span = (seg.days / totalDays) * 360;
      if (span > 0) {
        stops.push(`${seg.color} ${cursor}deg ${cursor + span}deg`);
        cursor += span;
      }
    });
    if (cursor < 360) stops.push(`${Theme.border} ${cursor}deg 360deg`);
  }

  const outerStroke = 7;
  const innerHole = size - outerStroke * 2 - 8;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          // @ts-expect-error web CSS
          background: `conic-gradient(from -90deg, ${color} 0deg ${safePct * 3.6}deg, ${Theme.border} ${safePct * 3.6}deg 360deg)`,
        }}>
        <View
          style={{
            width: innerHole,
            height: innerHole,
            borderRadius: innerHole / 2,
            alignItems: 'center',
            justifyContent: 'center',
            // @ts-expect-error web CSS
            background: `conic-gradient(from -90deg, ${stops.join(', ')})`,
          }}>
          <View
            style={{
              width: innerHole * 0.55,
              height: innerHole * 0.55,
              borderRadius: innerHole * 0.275,
              backgroundColor: Theme.surface,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function CategoryRadialChart({
  title,
  color,
  percentage,
  hasGoal,
  goalDays,
  totalHours,
  segments,
  size = 148,
}: CategoryRadialChartProps) {
  const displayPct = hasGoal ? `${Math.round(percentage)}%` : '—';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.chartWrap, { width: size, height: size }]}>
        {Platform.OS === 'web' ? (
          <ChartWeb
            size={size}
            percentage={percentage}
            color={color}
            goalDays={goalDays}
            segments={segments}
          />
        ) : (
          <ChartSvg
            size={size}
            percentage={percentage}
            color={color}
            goalDays={goalDays}
            segments={segments}
          />
        )}
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.pct}>{displayPct}</Text>
          {hasGoal && <Text style={styles.pctLabel}>monthly</Text>}
          {!hasGoal && <Text style={styles.noGoal}>No goal</Text>}
        </View>
      </View>
      <Text style={[styles.hours, { color }]}>{formatHours(totalHours)}</Text>
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.key} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {seg.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    width: '48%',
    ...cardShadow,
  },
  title: { fontSize: 14, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  chartWrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: { fontSize: 22, fontWeight: '800', color: Theme.text },
  pctLabel: { fontSize: 9, color: Theme.textSecondary, marginTop: 1, fontWeight: '600' },
  noGoal: { fontSize: 9, color: Theme.textSecondary, marginTop: 2 },
  hours: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  legend: { width: '100%', gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 11, fontWeight: '500', color: Theme.text },
});
