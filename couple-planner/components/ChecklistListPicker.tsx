import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PlanCategoryTheme } from '@/constants/plansTheme';
import { Fonts } from '@/constants/Typography';
import { Theme } from '@/constants/Theme';
import { PlanSubcategory } from '@/types';

interface ChecklistListPickerProps {
  options: PlanSubcategory[];
  selected: string;
  counts: Record<string, number>;
  onSelect: (key: string) => void;
  onManage: () => void;
  theme: PlanCategoryTheme;
  manageLabel?: string;
}

function ChevronDown({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ChecklistListPicker({
  options,
  selected,
  counts,
  onSelect,
  onManage,
  theme,
  manageLabel = 'New list',
}: ChecklistListPickerProps) {
  const [open, setOpen] = useState(false);
  const current = useMemo(() => options.find((o) => o.key === selected), [options, selected]);
  const openCount = current ? counts[current.key] ?? 0 : 0;

  const close = () => setOpen(false);

  const handleSelect = (key: string) => {
    onSelect(key);
    close();
  };

  const handleManage = () => {
    close();
    onManage();
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.accentMuted, borderColor: theme.accentLight },
          pressed && styles.triggerPressed,
          open && { borderColor: theme.accent },
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`List: ${current?.label ?? 'Choose a list'}`}>
        <View style={styles.triggerMain}>
          <Text style={[styles.triggerLabel, { color: theme.accentDark }]}>
            {current?.label ?? 'Choose a list'}
          </Text>
          {openCount > 0 ? (
            <View style={[styles.triggerBadge, { backgroundColor: theme.accent }]}>
              <Text style={styles.triggerBadgeText}>{openCount}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.chevron, open && { backgroundColor: theme.accentLight }]}>
          <ChevronDown color={theme.accentDark} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Your lists</Text>

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const active = selected === opt.key;
                const count = counts[opt.key] ?? 0;
                return (
                  <Pressable
                    key={opt.key}
                    style={({ pressed }) => [
                      styles.row,
                      active && { backgroundColor: theme.accentMuted },
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => handleSelect(opt.key)}>
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.dot,
                          active
                            ? { backgroundColor: theme.accent, borderColor: theme.accent }
                            : { borderColor: theme.accentLight },
                        ]}
                      />
                      <Text
                        style={[
                          styles.rowLabel,
                          active && { color: theme.accentDark, fontFamily: Fonts.semiBold },
                        ]}>
                        {opt.label}
                      </Text>
                    </View>
                    {count > 0 ? (
                      <View
                        style={[
                          styles.rowBadge,
                          active
                            ? { backgroundColor: theme.accent }
                            : { backgroundColor: theme.accentLight },
                        ]}>
                        <Text
                          style={[
                            styles.rowBadgeText,
                            active ? styles.rowBadgeTextOn : { color: theme.accentDark },
                          ]}>
                          {count}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [styles.manageRow, pressed && styles.rowPressed]}
              onPress={handleManage}>
              <Text style={[styles.manageText, { color: theme.accent }]}>+ {manageLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  triggerPressed: { opacity: 0.88 },
  triggerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  triggerLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    lineHeight: 20,
  },
  triggerBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  triggerBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 36, 56, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    maxHeight: '72%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Theme.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.border,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.border,
  },
  rowPressed: { opacity: 0.72 },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Theme.text,
    lineHeight: 22,
  },
  rowBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  rowBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  rowBadgeTextOn: { color: '#fff' },
  manageRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.border,
    marginTop: 4,
  },
  manageText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
});
