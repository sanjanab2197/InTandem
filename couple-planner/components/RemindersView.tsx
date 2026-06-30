import { format, isPast, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import CalendarDatePicker from '@/components/CalendarDatePicker';
import RepeatPickerSheet from '@/components/RepeatPickerSheet';
import TimeScrollPicker from '@/components/TimeScrollPicker';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { AddReminderInput, Reminder, ReminderRepeat } from '@/types';
import { firstName, participantLabel } from '@/utils/participant';
import {
  datePickerLabel,
  datePickerValue,
  formatReminderSchedule,
  getRepeatLabel,
  isRepeatingReminder,
  normalizeRepeat,
  repeatLabel,
  repeatNeedsDatePicker,
  repeatNeedsTimeOnly,
} from '@/utils/reminderRepeat';
import {
  assigneeFromChoice,
  assigneeToChoice,
  ensureNotificationSetup,
} from '@/utils/reminderNotifications';

interface RemindersViewProps {
  theme: PlanCategoryTheme;
  mySlot: 1 | 2 | null;
  addReminder: (input: AddReminderInput) => Promise<Reminder>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  pushReminder?: (reminder: Reminder) => Promise<void>;
  onSaved?: () => void;
  onDeleted?: (id: string) => void;
}

export default function RemindersView({
  theme,
  mySlot,
  addReminder,
  updateReminder,
  deleteReminder,
  pushReminder,
  onSaved,
  onDeleted,
}: RemindersViewProps) {
  const { profile, reminders } = useApp();
  const { couple } = useCouple();

  const [text, setText] = useState('');
  const [remindAt, setRemindAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0, 0);
    return d;
  });
  const [assigneeChoice, setAssigneeChoice] = useState<'me' | 'partner' | 'both'>('me');
  const [repeatChoice, setRepeatChoice] = useState<ReminderRepeat>('none');
  const [repeatPickerOpen, setRepeatPickerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'date' | 'time' | null>(null);
  const [pickerDraft, setPickerDraft] = useState(() => new Date());
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const p1Name = firstName(profile.partner1Name);
  const p2Name = firstName(profile.partner2Name);
  const partnerName = mySlot === 2 ? p1Name : mySlot === 1 ? p2Name : p2Name;

  const sorted = useMemo(() => {
    return [...reminders].sort(
      (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
    );
  }, [reminders]);

  const upcoming = sorted.filter(
    (r) => isRepeatingReminder(r.repeat) || !isPast(parseISO(r.remindAt))
  );
  const past = sorted.filter(
    (r) => !isRepeatingReminder(r.repeat) && isPast(parseISO(r.remindAt))
  );

  const { accent, accentDark, accentLight, accentMuted } = theme;

  const resetForm = () => {
    setText('');
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0, 0);
    setRemindAt(d);
    setAssigneeChoice('me');
    setRepeatChoice('none');
    setEditing(null);
    setOpenMenu(null);
  };

  const toggleMenu = (menu: 'date' | 'time') => {
    if (openMenu === menu) {
      setOpenMenu(null);
      return;
    }
    setPickerDraft(new Date(remindAt));
    setOpenMenu(menu);
  };

  const confirmPicker = () => {
    setRemindAt(new Date(pickerDraft));
    setOpenMenu(null);
  };

  const openEdit = (reminder: Reminder) => {
    setEditing(reminder);
    setText(reminder.text);
    const when = parseISO(reminder.remindAt);
    setRemindAt(when);
    setAssigneeChoice(assigneeToChoice(reminder.assignee, mySlot));
    setRepeatChoice(normalizeRepeat(reminder.repeat));
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Missing reminder', 'Please enter what you want to be reminded about.');
      return;
    }
    if (normalizeRepeat(repeatChoice) === 'none' && remindAt.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'Please choose a date and time in the future.');
      return;
    }

    const granted = await ensureNotificationSetup();
    if (!granted) {
      Alert.alert(
        'Notifications off',
        'Enable notifications in your phone settings to receive reminders.'
      );
      return;
    }

    const assignee = assigneeFromChoice(assigneeChoice, mySlot);
    const payload = {
      text: trimmed,
      remindAt: remindAt.toISOString(),
      assignee,
      repeat: repeatChoice,
    };

    if (editing) {
      const saved = await updateReminder({ ...editing, ...payload });
      if (pushReminder) {
        await pushReminder(saved);
      } else {
        onSaved?.();
      }
    } else {
      const created = await addReminder(payload);
      if (pushReminder) {
        await pushReminder(created);
      } else {
        onSaved?.();
      }
    }

    resetForm();
  };

  const renderReminder = (reminder: Reminder) => {
    const when = parseISO(reminder.remindAt);
    const repeating = isRepeatingReminder(reminder.repeat);
    const overdue = !repeating && isPast(when);
    const repeatNote = repeatLabel(reminder.repeat);

    return (
      <View key={reminder.id} style={[styles.card, PlansUI.cardShadow, { borderColor: accentLight }]}>
        <Pressable
          style={styles.checkArea}
          onPress={async () => {
            if (editing?.id === reminder.id) {
              resetForm();
            }
            await deleteReminder(reminder.id);
            await onDeleted?.(reminder.id);
          }}>
          <View style={[styles.checkbox, { borderColor: accent }]}>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardText}>{reminder.text}</Text>
            <Text style={[styles.cardWhen, { color: accent }, overdue && styles.cardOverdue]}>
              {formatReminderSchedule(when, reminder.repeat)}
              {overdue ? ' · overdue' : ''}
            </Text>
            {repeatNote && (
              <Text style={[styles.cardRepeat, { color: accentDark }]}>{repeatNote}</Text>
            )}
            <Text style={styles.cardAssignee}>
              For {participantLabel(reminder.assignee, profile)}
            </Text>
          </View>
        </Pressable>
        <View style={styles.cardActions}>
          <Pressable onPress={() => openEdit(reminder)}>
            <Text style={[styles.editLink, { color: accent }]}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => setDeleteTarget(reminder)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {upcoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcoming.map(renderReminder)}
        </>
      )}

      {past.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Past</Text>
          {past.map(renderReminder)}
        </>
      )}

      {reminders.length === 0 && (
        <View style={[styles.empty, { backgroundColor: accentMuted, borderColor: accentLight }]}>
          <Text style={styles.emptyEmoji}>{theme.icon}</Text>
          <Text style={[styles.emptyText, { color: accentDark }]}>No reminders yet</Text>
          <Text style={styles.emptySubtext}>
            Set a date and time — we'll notify you on your phone
          </Text>
        </View>
      )}

      <View style={[styles.addCard, { borderColor: accentLight, backgroundColor: accentMuted }]}>
        <Text style={[styles.addTitle, { color: accentDark }]}>{editing ? 'Edit reminder' : 'New reminder'}</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="What should we remind you about?"
          placeholderTextColor={Theme.textSecondary}
        />

        <Text style={styles.fieldLabel}>Date & time</Text>
        <View style={styles.dateTimeStack}>
          {repeatNeedsDatePicker(repeatChoice) && (
            <>
              <Pressable
                style={[
                  styles.dateBtn,
                  openMenu === 'date' && { borderColor: accent, backgroundColor: accentLight },
                ]}
                onPress={() => toggleMenu('date')}>
                <View style={styles.dateBtnInner}>
                  <Text style={[styles.dateBtnLabel, { color: accent }]}>
                    {datePickerLabel(repeatChoice)}
                  </Text>
                  <Text style={styles.dateBtnText}>{datePickerValue(repeatChoice, remindAt)}</Text>
                </View>
                <Text style={[styles.chevron, { color: accent }]}>{openMenu === 'date' ? '▴' : '▾'}</Text>
              </Pressable>
              {openMenu === 'date' && (
                <View style={[styles.dropdown, { borderColor: accentLight }]}>
                  <CalendarDatePicker
                    value={pickerDraft}
                    onChange={setPickerDraft}
                    minimumDate={normalizeRepeat(repeatChoice) === 'none' ? new Date() : undefined}
                  />
                  <Pressable style={[styles.dropdownDone, { backgroundColor: accent }]} onPress={confirmPicker}>
                    <Text style={styles.dropdownDoneText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          <Pressable
            style={[
              styles.dateBtn,
              openMenu === 'time' && { borderColor: accent, backgroundColor: accentLight },
            ]}
            onPress={() => toggleMenu('time')}>
            <View style={styles.dateBtnInner}>
              <Text style={[styles.dateBtnLabel, { color: accent }]}>Time</Text>
              <Text style={styles.dateBtnText}>{format(remindAt, 'h:mm a')}</Text>
            </View>
            <Text style={[styles.chevron, { color: accent }]}>{openMenu === 'time' ? '▴' : '▾'}</Text>
          </Pressable>
          {openMenu === 'time' && (
            <View style={[styles.dropdown, { borderColor: accentLight }]}>
              <TimeScrollPicker value={pickerDraft} onChange={setPickerDraft} />
              <Pressable style={[styles.dropdownDone, { backgroundColor: accent }]} onPress={confirmPicker}>
                <Text style={styles.dropdownDoneText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.dateBtn, { marginBottom: 12 }]}
          onPress={() => setRepeatPickerOpen(true)}>
          <Text style={styles.repeatRowLabel}>Repeat</Text>
          <Text style={[styles.repeatValue, { color: accentDark }]}>{getRepeatLabel(repeatChoice)}</Text>
          <Text style={[styles.chevron, { color: accent }]}>›</Text>
        </Pressable>

        <Text style={styles.fieldLabel}>Remind who?</Text>
        <View style={styles.chipRow}>
          {(
            [
              { key: 'me' as const, label: 'Me' },
              { key: 'partner' as const, label: partnerName },
              { key: 'both' as const, label: 'Both' },
            ] as const
          ).map(({ key, label }) => (
            <Pressable
              key={key}
              style={[
                styles.chip,
                assigneeChoice === key && { backgroundColor: accentLight, borderColor: accent },
              ]}
              onPress={() => setAssigneeChoice(key)}>
              <Text
                style={[
                  styles.chipText,
                  assigneeChoice === key && { color: accent, fontWeight: '700' },
                ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {couple?.connected && (
          <Text style={styles.syncHint}>
            Partner reminders sync when connected — they'll get a notification on their phone too.
          </Text>
        )}

        <View style={styles.formActions}>
          {editing && (
            <Pressable style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Set reminder'}</Text>
          </Pressable>
        </View>
      </View>

      <RepeatPickerSheet
        visible={repeatPickerOpen}
        selected={repeatChoice}
        accent={accent}
        accentLight={accentLight}
        onSelect={(next) => {
          setRepeatChoice(next);
          if (repeatNeedsTimeOnly(next)) setOpenMenu(null);
        }}
        onClose={() => setRepeatPickerOpen(false)}
      />

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <Text style={styles.popupTitle}>Delete reminder?</Text>
            <Text style={styles.popupMessage}>
              Remove "{deleteTarget?.text}"? The scheduled notification will be cancelled.
            </Text>
            <View style={styles.popupActions}>
              <Pressable style={styles.popupCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.popupCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.popupConfirm, { backgroundColor: PlansUI.delete }]}
                onPress={async () => {
                  if (deleteTarget) {
                    await deleteReminder(deleteTarget.id);
                    onDeleted?.(deleteTarget.id);
                  }
                  setDeleteTarget(null);
                }}>
                <Text style={styles.popupConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Theme.textSecondary, marginBottom: 8 },
  sectionTitleSpaced: { marginTop: 16 },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 14, color: Theme.textSecondary, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  checkArea: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardText: { fontSize: 16, color: Theme.text, lineHeight: 22, fontWeight: '600' },
  cardTextDone: { textDecorationLine: 'line-through', color: Theme.textSecondary },
  cardWhen: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  cardRepeat: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  cardOverdue: { color: PlansUI.delete },
  cardAssignee: { fontSize: 12, color: Theme.textSecondary, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginLeft: 36 },
  editLink: { fontSize: 13, fontWeight: '600' },
  deleteLink: { fontSize: 13, fontWeight: '600', color: PlansUI.delete },
  addCard: {
    marginTop: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  addTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  input: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTimeStack: { gap: 8, marginBottom: 12 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  dateBtnInner: { flex: 1 },
  chevron: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  dropdown: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownDone: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  dropdownDoneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dateBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  dateBtnText: { fontSize: 14, fontWeight: '700', color: Theme.text },
  repeatRowLabel: { fontSize: 16, fontWeight: '500', color: Theme.text },
  repeatValue: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'right', marginRight: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  syncHint: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18, marginBottom: 12 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  cancelBtnText: { color: Theme.textSecondary, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  popup: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  popupTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  popupMessage: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 24 },
  popupActions: { flexDirection: 'row', gap: 12 },
  popupCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  popupCancelText: { fontSize: 15, fontWeight: '600', color: Theme.textSecondary },
  popupConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
