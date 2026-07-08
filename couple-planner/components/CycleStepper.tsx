import { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CYCLE_THEME } from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';

interface CycleStepperProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export default function CycleStepper({ label, hint, value, min, max, onChange }: CycleStepperProps) {
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const stopRepeat = useCallback(() => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);

  useEffect(() => stopRepeat, [stopRepeat]);

  const step = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(valueRef.current + delta, min), max);
      onChange(next);
    },
    [min, max, onChange]
  );

  const startRepeat = useCallback(
    (delta: number) => {
      stopRepeat();
      step(delta);
      repeatRef.current = setInterval(() => step(delta), 140);
    },
    [step, stopRepeat]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={() => step(-1)}
          onLongPress={() => startRepeat(-1)}
          onPressOut={stopRepeat}
          disabled={value <= min}
          accessibilityLabel={`Decrease ${label}`}>
          <Text style={[styles.btnText, value <= min && styles.btnTextDisabled]}>−</Text>
        </Pressable>
        <View style={styles.valueBox}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.unit}>days</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={() => step(1)}
          onLongPress={() => startRepeat(1)}
          onPressOut={stopRepeat}
          disabled={value >= max}
          accessibilityLabel={`Increase ${label}`}>
          <Text style={[styles.btnText, value >= max && styles.btnTextDisabled]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary, marginBottom: 6 },
  hint: { fontSize: 11, color: Theme.textSecondary, marginBottom: 8, lineHeight: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 6,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: CYCLE_THEME.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const, userSelect: 'none' as const } : {}),
  },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  btnText: { fontSize: 24, fontWeight: '300', color: CYCLE_THEME.accentDark, lineHeight: 26 },
  btnTextDisabled: { opacity: 0.35 },
  valueBox: { flex: 1, alignItems: 'center' },
  value: { fontSize: 26, fontWeight: '700', color: Theme.text },
  unit: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary, marginTop: 2 },
});
