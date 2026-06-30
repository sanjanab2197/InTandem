import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Theme } from '@/constants/Theme';
import { ReminderRepeat } from '@/types';
import { getRepeatLabel, REPEAT_OPTIONS } from '@/utils/reminderRepeat';

interface RepeatPickerSheetProps {
  visible: boolean;
  selected: ReminderRepeat;
  accent: string;
  accentLight: string;
  onSelect: (repeat: ReminderRepeat) => void;
  onClose: () => void;
}

export default function RepeatPickerSheet({
  visible,
  selected,
  accent,
  accentLight,
  onSelect,
  onClose,
}: RepeatPickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Repeat</Text>
          <ScrollView style={styles.list} bounces={false}>
            {REPEAT_OPTIONS.map((option) => {
              const isSelected = selected === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.row, isSelected && { backgroundColor: accentLight }]}
                  onPress={() => {
                    onSelect(option.key);
                    onClose();
                  }}>
                  <Text style={[styles.rowLabel, isSelected && { color: accent, fontWeight: '700' }]}>
                    {option.label}
                  </Text>
                  {isSelected && <Text style={[styles.check, { color: accent }]}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={[styles.doneBtn, { backgroundColor: accentLight }]} onPress={onClose}>
            <Text style={[styles.doneBtnText, { color: accent }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Label for the compact repeat row in the form */
export function repeatRowSummary(repeat: ReminderRepeat): string {
  return getRepeatLabel(repeat);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  list: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowLabel: { flex: 1, fontSize: 17, color: Theme.text },
  check: { fontSize: 18, fontWeight: '700' },
  doneBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700' },
});
