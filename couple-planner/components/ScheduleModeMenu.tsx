import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';

export type ScheduleViewMode = 'schedule' | 'cycle';

const MODES: { key: ScheduleViewMode; label: string; hint: string }[] = [
  { key: 'schedule', label: 'Schedule', hint: 'Events & day timeline' },
  { key: 'cycle', label: 'Cycle & health', hint: 'Period, ovulation, logs' },
];

interface ScheduleModeMenuProps {
  mode: ScheduleViewMode;
  onModeChange: (mode: ScheduleViewMode) => void;
}

export default function ScheduleModeMenu({ mode, onModeChange }: ScheduleModeMenuProps) {
  const [open, setOpen] = useState(false);
  const current = MODES.find((m) => m.key === mode) ?? MODES[0];

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={() => setOpen(true)}>
        <Text style={styles.triggerLabel}>{current.label}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.menuTitle}>Calendar view</Text>
            {MODES.map((opt) => {
              const selected = mode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.menuItem, selected && styles.menuItemSelected]}
                  onPress={() => {
                    onModeChange(opt.key);
                    setOpen(false);
                  }}>
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuLabel, selected && styles.menuLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.menuHint}>{opt.hint}</Text>
                  </View>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  triggerPressed: { backgroundColor: Theme.primaryLight },
  triggerLabel: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Theme.primaryDark,
  },
  chevron: { fontSize: 11, color: Theme.primary, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 28,
  },
  menu: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.border,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  menuItemSelected: { backgroundColor: Theme.primaryLight },
  menuItemText: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '600', color: Theme.text },
  menuLabelSelected: { color: Theme.primaryDark },
  menuHint: { fontSize: 12, color: Theme.textSecondary, marginTop: 2 },
  check: { fontSize: 16, fontWeight: '700', color: Theme.primaryDark },
});
