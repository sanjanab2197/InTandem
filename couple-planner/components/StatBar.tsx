import { View, StyleSheet, Text } from 'react-native';

import { Theme } from '@/constants/Theme';

interface StatBarProps {
  label: string;
  days: number;
  sessions: number;
  hours: number;
  goalDays: number;
  color: string;
}

export default function StatBar({ label, days, sessions, hours, goalDays, color }: StatBarProps) {
  const pct = goalDays > 0 ? Math.min((days / goalDays) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.numbers}>
          {days}d · {sessions} · {hours}h
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 14, fontWeight: '500', color: Theme.text },
  numbers: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  track: {
    height: 10,
    backgroundColor: Theme.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },
});
