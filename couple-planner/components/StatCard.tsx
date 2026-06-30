import { StyleSheet, Text, View } from 'react-native';

import { Theme } from '@/constants/Theme';

interface ProgressBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

export default function ProgressBar({ label, count, total, color }: ProgressBarProps) {
  const pct = total > 0 ? count / total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>
          {count}
          {total > 0 ? ` (${Math.round(pct * 100)}%)` : ''}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

interface StatCardProps {
  title: string;
  emoji: string;
  total: number;
  color: string;
  children: React.ReactNode;
}

export function StatCard({ title, emoji, total, color, children }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardTotal, { color }]}>{total} events</Text>
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, color: Theme.text, fontWeight: '500' },
  count: { fontSize: 13, color: Theme.textSecondary },
  track: {
    height: 8,
    backgroundColor: Theme.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  emoji: { fontSize: 28, marginRight: 12 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  cardTotal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  cardBody: { gap: 4 },
});
