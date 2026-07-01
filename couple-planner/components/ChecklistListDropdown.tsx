import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
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

function MenuLinesIcon({ color }: { color: string }) {
  return (
    <View style={styles.menuLines}>
      <View style={[styles.menuLine, { backgroundColor: color }]} />
      <View style={[styles.menuLine, { backgroundColor: color }]} />
      <View style={[styles.menuLine, { backgroundColor: color }]} />
    </View>
  );
}

export default function ChecklistListDropdown({
  options,
  selected,
  onSelect,
  onManageLists,
  theme,
  menuTitle = 'Lists',
  manageLabel = '+ Add / edit list',
  placeholder = 'Choose list',
}: ChecklistListDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === selected) ?? options[0];

  return (
    <View>
      <Pressable
        style={[styles.trigger, PlansUI.cardShadow]}
        onPress={() => setOpen(true)}>
        <View style={[styles.triggerIcon, { backgroundColor: theme.accentLight }]}>
          <MenuLinesIcon color={theme.accentDark} />
        </View>
        <Text style={styles.triggerLabel}>{current?.label ?? placeholder}</Text>
        <Text style={[styles.chevron, { color: theme.accent }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.menu, PlansUI.cardShadow]} onPress={() => {}}>
            <Text style={styles.menuTitle}>{menuTitle}</Text>
            <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
              {options.map((opt) => {
                const isSelected = selected === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.menuItem, isSelected && { backgroundColor: theme.accentMuted }]}
                    onPress={() => {
                      onSelect(opt.key);
                      setOpen(false);
                    }}>
                    {isSelected ? (
                      <View style={[styles.selectedBar, { backgroundColor: theme.accent }]} />
                    ) : (
                      <View style={styles.selectedBarPlaceholder} />
                    )}
                    <Text
                      style={[
                        styles.menuText,
                        isSelected && { fontWeight: '700', color: theme.accentDark },
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.manageBtn}
              onPress={() => {
                setOpen(false);
                onManageLists();
              }}>
              <Text style={[styles.manageBtnText, { color: theme.accent }]}>{manageLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menuLines: {
    width: 16,
    gap: 3,
  },
  menuLine: {
    height: 2,
    borderRadius: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 12,
  },
  triggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: Theme.text },
  chevron: { fontSize: 13, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 28,
  },
  menu: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  menuScroll: {
    maxHeight: 320,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 18,
    gap: 12,
  },
  selectedBar: {
    width: 3,
    height: 22,
    borderRadius: 2,
  },
  selectedBarPlaceholder: {
    width: 3,
  },
  menuText: { flex: 1, fontSize: 16, color: Theme.text },
  manageBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.border,
    backgroundColor: Theme.background,
  },
  manageBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
