import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlanCategoryTheme } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { PlanSubcategory } from '@/types';

interface ChecklistListDropdownProps {
  options: PlanSubcategory[];
  selected: string;
  onSelect: (key: string) => void;
  onManageLists: () => void;
  theme: PlanCategoryTheme;
  menuTitle?: string;
  manageLabel?: string;
  placeholder?: string;
}

export default function ChecklistListDropdown({
  options,
  selected,
  onSelect,
  onManageLists,
  theme,
  manageLabel = '+ Edit',
}: ChecklistListDropdownProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled">
        {options.map((opt) => {
          const active = selected === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.chip,
                active && { backgroundColor: theme.accentLight, borderColor: theme.accent },
              ]}
              onPress={() => onSelect(opt.key)}>
              <Text
                style={[
                  styles.chipText,
                  active && { color: theme.accentDark, fontWeight: '700' },
                ]}
                numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.addChip, { borderColor: theme.accent }]}
          onPress={onManageLists}>
          <Text style={[styles.addChipText, { color: theme.accent }]}>{manageLabel}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.border,
    backgroundColor: Theme.surface,
    maxWidth: 160,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  addChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  addChipText: { fontSize: 12, fontWeight: '700' },
});
