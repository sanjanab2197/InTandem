import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getPlanTheme } from '@/constants/plansTheme';
import { PLAN_CATEGORIES, Theme } from '@/constants/Theme';
import { PlanCategory } from '@/types';

interface CategoryDropdownProps {
  selected: PlanCategory;
  onSelect: (category: PlanCategory) => void;
}

export default function CategoryDropdown({ selected, onSelect }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = PLAN_CATEGORIES.find((c) => c.key === selected)!;
  const selectedTheme = getPlanTheme(selected);

  return (
    <View>
      <Pressable
        style={[styles.trigger, { borderColor: selectedTheme.accentLight, backgroundColor: selectedTheme.accentMuted }]}
        onPress={() => setOpen(true)}>
        <View style={[styles.triggerIcon, { backgroundColor: selectedTheme.accentLight }]}>
          <Text style={styles.triggerIconText}>{selectedTheme.icon}</Text>
        </View>
        <Text style={[styles.triggerLabel, { color: selectedTheme.accentDark }]}>{current.label}</Text>
        <Text style={[styles.chevron, { color: selectedTheme.accent }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Choose Category</Text>
            {PLAN_CATEGORIES.map((cat) => {
              const theme = getPlanTheme(cat.key);
              const isSelected = selected === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.menuItem,
                    isSelected && { backgroundColor: theme.accentLight },
                  ]}
                  onPress={() => {
                    onSelect(cat.key);
                    setOpen(false);
                  }}>
                  <View style={[styles.menuIconWrap, { backgroundColor: theme.accentMuted }]}>
                    <Text style={styles.menuIcon}>{theme.icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.menuText,
                      isSelected && { fontWeight: '700', color: theme.accentDark },
                    ]}>
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <Text style={[styles.check, { color: theme.accent }]}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#3D3550',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  triggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerIconText: { fontSize: 16 },
  triggerLabel: { flex: 1, fontSize: 17, fontWeight: '700' },
  chevron: { fontSize: 16, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  menu: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 8,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 16 },
  menuText: { flex: 1, fontSize: 16, color: Theme.text },
  check: { fontSize: 16, fontWeight: '700' },
});
