import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Theme } from '@/constants/Theme';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label?: string;
  sublabel?: string;
}

function CircularProgressNative({
  percentage,
  size,
  strokeWidth,
  color,
}: Pick<CircularProgressProps, 'percentage' | 'size' | 'strokeWidth' | 'color'>) {
  const radius = (size! - strokeWidth!) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Number.isFinite(percentage) ? percentage : 0;
  const clamped = Math.min(Math.max(safePct, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;
  const center = size! / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={Theme.border}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <G transform={`rotate(-90 ${center} ${center})`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

function CircularProgressWeb({
  percentage,
  size,
  strokeWidth,
  color,
}: Pick<CircularProgressProps, 'percentage' | 'size' | 'strokeWidth' | 'color'>) {
  const safePct = Number.isFinite(percentage) ? Math.min(Math.max(percentage, 0), 100) : 0;
  const inner = size! - strokeWidth! * 2;

  return (
    <View
      style={[
        styles.webRing,
        {
          width: size,
          height: size,
          borderRadius: size! / 2,
          // @ts-expect-error conic-gradient is web-only CSS
          background: `conic-gradient(from -90deg, ${color} 0deg ${safePct * 3.6}deg, ${Theme.border} ${safePct * 3.6}deg 360deg)`,
        },
      ]}>
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: Theme.surface,
        }}
      />
    </View>
  );
}

export default function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 10,
  color,
  label,
  sublabel,
}: CircularProgressProps) {
  const safePct = Number.isFinite(percentage) ? percentage : 0;
  const displayPct = `${Math.round(safePct)}%`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {Platform.OS === 'web' ? (
        <CircularProgressWeb
          percentage={percentage}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
        />
      ) : (
        <CircularProgressNative
          percentage={percentage}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
        />
      )}
      <View style={styles.center} pointerEvents="none">
        {label !== undefined ? (
          <Text style={[styles.label, { fontSize: size * 0.22 }]}>{label}</Text>
        ) : (
          <Text style={[styles.pct, { fontSize: size * 0.22 }]}>{displayPct}</Text>
        )}
        {sublabel ? (
          <Text style={[styles.sublabel, { fontSize: size * 0.11 }]}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  webRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: { fontWeight: '800', color: Theme.text },
  label: { fontWeight: '800', color: Theme.text },
  sublabel: { color: Theme.textSecondary, fontWeight: '500', marginTop: 2 },
});
