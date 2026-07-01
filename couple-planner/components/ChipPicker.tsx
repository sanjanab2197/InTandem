import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Theme } from '@/constants/Theme';

interface ChipPickerProps {
  label?: string;
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
  includeAll?: boolean;
  accentColor?: string;
  accentLight?: string;
}

export default function ChipPicker({
  label,
  options,
  selected,
  onSelect,
  includeAll = false,
  accentColor = Theme.primary,
  accentLight = Theme.primaryLight,
}: ChipPickerProps) {
  const activeStyle = { backgroundColor: accentLight, borderColor: accentColor };
  const activeTextStyle = { color: accentColor, fontWeight: '700' as const };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {includeAll && (
          <Pressable
            style={[styles.chip, selected === 'all' && activeStyle]}
            onPress={() => onSelect('all')}>
            <Text style={[styles.chipText, selected === 'all' && activeTextStyle]}>All</Text>
          </Pressable>
        )}
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.chip, selected === opt.key && activeStyle]}
            onPress={() => onSelect(opt.key)}>
            <Text style={[styles.chipText, selected === opt.key && activeTextStyle]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
});
