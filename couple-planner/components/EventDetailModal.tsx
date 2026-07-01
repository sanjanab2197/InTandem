import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import CalendarDatePicker from '@/components/CalendarDatePicker';
import {
  getCategoryLabel,
  getSubcategoryLabel,
  resolveEventColor,
} from '@/constants/eventCategories';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { CalendarEvent, EventCategoryConfig, Participant } from '@/types';
import { formatEventDateRange, isMultiDayEvent } from '@/utils/calendarEvents';
import { firstName, participantLabel } from '@/utils/participant';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
  minimumDate?: Date;
}

function DateField({ label, value, onChange, minimumDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dateField}>
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <Pressable style={styles.dateTrigger} onPress={() => setOpen(true)}>
        <Text style={styles.dateTriggerText}>{format(parseISO(value), 'MMM d, yyyy')}</Text>
        <Text style={styles.dateChevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dateOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dateMenu} onPress={() => {}}>
            <Text style={styles.dateMenuTitle}>{label}</Text>
            <CalendarDatePicker
              value={parseISO(value)}
              minimumDate={minimumDate}
              onChange={(d) => onChange(format(d, 'yyyy-MM-dd'))}
            />
            <Pressable style={styles.dateDoneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.dateDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface EventDetailModalProps {
  visible: boolean;
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

function buildEmptyForm(categories: EventCategoryConfig[], startDate: string) {
  const category = categories[0];
  const subcategory = category?.subcategories[0]?.key ?? 'general';
  return {
    title: '',
    time: '',
    durationHours: '',
    notes: '',
    category: category?.key ?? 'entertainment',
    subcategory,
    participant: 'together' as Participant,
    startDate,
    endDate: startDate,
    isMultiDay: false,
  };
}

export default function EventDetailModal({
  visible,
  date,
  events,
  onClose,
  onSave,
  onDelete,
}: EventDetailModalProps) {
  const { profile, eventCategories } = useApp();
  const emptyForm = buildEmptyForm(eventCategories, date);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!visible) {
      setEditing(null);
      setIsCreating(false);
      setForm(buildEmptyForm(eventCategories, date));
    }
  }, [visible, eventCategories, date]);

  const selectedCategory =
    eventCategories.find((c) => c.key === form.category) ?? eventCategories[0];
  const subcategories = selectedCategory?.subcategories ?? [];

  const openCreate = () => {
    setIsCreating(true);
    setEditing(null);
    setForm(buildEmptyForm(eventCategories, date));
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setIsCreating(false);
    const multi = isMultiDayEvent(event);
    setForm({
      title: event.title,
      time: event.time ?? '',
      durationHours: event.durationMinutes ? String(event.durationMinutes / 60) : '',
      notes: event.notes ?? '',
      category: event.category,
      subcategory: event.subcategory,
      participant: event.participant ?? 'together',
      startDate: event.date,
      endDate: multi ? (event.endDate ?? event.date) : event.date,
      isMultiDay: multi,
    });
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      Alert.alert('Missing title', 'Please enter an event title.');
      return;
    }
    if (form.isMultiDay && form.endDate < form.startDate) {
      Alert.alert('Invalid dates', 'End date must be on or after the start date.');
      return;
    }
    const durationMinutes = form.durationHours.trim()
      ? Math.round(parseFloat(form.durationHours) * 60)
      : undefined;

    onSave({
      ...(editing ? { id: editing.id } : {}),
      title: form.title.trim(),
      date: form.startDate,
      endDate: form.isMultiDay && form.endDate > form.startDate ? form.endDate : undefined,
      time: form.time.trim() || undefined,
      durationMinutes: durationMinutes && !isNaN(durationMinutes) ? durationMinutes : undefined,
      notes: form.notes.trim() || undefined,
      category: form.category,
      subcategory: form.subcategory,
      participant: form.participant,
    });
    setEditing(null);
    setIsCreating(false);
    setForm(buildEmptyForm(eventCategories, date));
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(id);
          setEditing(null);
          setIsCreating(false);
        },
      },
    ]);
  };

  const showForm = isCreating || editing;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>Done</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{format(parseISO(date), 'EEEE, MMM d')}</Text>
          <Pressable onPress={openCreate}>
            <Text style={styles.addBtn}>+ Add</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder="Event title"
                placeholderTextColor={Theme.textSecondary}
              />

              <Text style={styles.formLabel}>Time (optional)</Text>
              <TextInput
                style={styles.input}
                value={form.time}
                onChangeText={(t) => setForm({ ...form, time: t })}
                placeholder="e.g. 7:00 PM"
                placeholderTextColor={Theme.textSecondary}
              />

              <View style={styles.multiDayRow}>
                <View style={styles.multiDayText}>
                  <Text style={styles.multiDayTitle}>Multi-day</Text>
                  <Text style={styles.multiDayDesc}>For spanning several days</Text>
                </View>
                <Switch
                  value={form.isMultiDay}
                  onValueChange={(isMultiDay) =>
                    setForm({
                      ...form,
                      isMultiDay,
                      endDate: isMultiDay ? form.endDate : form.startDate,
                    })
                  }
                  trackColor={{ false: Theme.border, true: Theme.primaryLight }}
                  thumbColor={form.isMultiDay ? Theme.primary : Theme.surface}
                />
              </View>

              {form.isMultiDay ? (
                <View style={styles.dateRow}>
                  <DateField
                    label="Start"
                    value={form.startDate}
                    onChange={(startDate) =>
                      setForm({
                        ...form,
                        startDate,
                        endDate: form.endDate < startDate ? startDate : form.endDate,
                      })
                    }
                  />
                  <DateField
                    label="End"
                    value={form.endDate}
                    minimumDate={parseISO(form.startDate)}
                    onChange={(endDate) => setForm({ ...form, endDate })}
                  />
                </View>
              ) : null}

              <Text style={styles.formLabel}>Duration in hours (optional)</Text>
              <TextInput
                style={styles.input}
                value={form.durationHours}
                onChangeText={(t) => setForm({ ...form, durationHours: t })}
                placeholder="e.g. 1.5"
                placeholderTextColor={Theme.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.formLabel}>Who did this?</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, form.participant === 'together' && styles.chipActive]}
                  onPress={() => setForm({ ...form, participant: 'together' })}>
                  <Text
                    style={[styles.chipText, form.participant === 'together' && styles.chipTextActive]}>
                    ♥ Together
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, form.participant === 'partner1' && styles.chipActive]}
                  onPress={() => setForm({ ...form, participant: 'partner1' })}>
                  <Text
                    style={[styles.chipText, form.participant === 'partner1' && styles.chipTextActive]}>
                    {firstName(profile.partner1Name)}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, form.participant === 'partner2' && styles.chipActive]}
                  onPress={() => setForm({ ...form, participant: 'partner2' })}>
                  <Text
                    style={[styles.chipText, form.participant === 'partner2' && styles.chipTextActive]}>
                    {firstName(profile.partner2Name)}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chipRow}>
                {eventCategories.map((cat) => (
                  <Pressable
                    key={cat.key}
                    style={[
                      styles.chip,
                      form.category === cat.key && { backgroundColor: cat.color },
                    ]}
                    onPress={() =>
                      setForm({
                        ...form,
                        category: cat.key,
                        subcategory: cat.subcategories[0]?.key ?? 'general',
                      })
                    }>
                    <Text style={[styles.chipText, form.category === cat.key && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Subcategory</Text>
              <View style={styles.chipRow}>
                {subcategories.map((sub) => (
                  <Pressable
                    key={sub.key}
                    style={[styles.chip, form.subcategory === sub.key && styles.chipActive]}
                    onPress={() => setForm({ ...form, subcategory: sub.key })}>
                    <Text
                      style={[styles.chipText, form.subcategory === sub.key && styles.chipTextActive]}>
                      {sub.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={(t) => setForm({ ...form, notes: t })}
                placeholder="Add notes..."
                placeholderTextColor={Theme.textSecondary}
                multiline
              />

              <View style={styles.formActions}>
                {editing && (
                  <Pressable style={styles.deleteBtn} onPress={() => handleDelete(editing.id)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                )}
                <Pressable style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {events.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>📅</Text>
                  <Text style={styles.emptyText}>No events scheduled</Text>
                  <Text style={styles.emptySubtext}>Tap + Add to create one</Text>
                </View>
              ) : (
                events.map((event) => (
                  <Pressable key={event.id} style={styles.eventCard} onPress={() => openEdit(event)}>
                    <View
                      style={[styles.eventDot, { backgroundColor: resolveEventColor(event, eventCategories) }]}
                    />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      {isMultiDayEvent(event) ? (
                        <Text style={styles.eventDateRange}>{formatEventDateRange(event)}</Text>
                      ) : event.time ? (
                        <Text style={styles.eventTime}>{event.time}</Text>
                      ) : null}
                      {event.durationMinutes ? (
                        <Text style={styles.eventDuration}>
                          {event.durationMinutes >= 60
                            ? `${Math.round((event.durationMinutes / 60) * 10) / 10} hrs`
                            : `${event.durationMinutes} min`}
                        </Text>
                      ) : null}
                      <Text style={styles.eventCategory}>
                        {getCategoryLabel(eventCategories, event.category)} ·{' '}
                        {getSubcategoryLabel(eventCategories, event.category, event.subcategory)}
                      </Text>
                      <Text style={styles.eventParticipant}>
                        {participantLabel(event.participant, profile)}
                      </Text>
                      {event.notes && <Text style={styles.eventNotes}>{event.notes}</Text>}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
    backgroundColor: Theme.surface,
  },
  closeBtn: { fontSize: 16, color: Theme.primary, fontWeight: '600' },
  addBtn: { fontSize: 16, color: Theme.primary, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  body: { flex: 1, padding: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Theme.text },
  emptySubtext: { fontSize: 14, color: Theme.textSecondary, marginTop: 4 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: Theme.text },
  eventDateRange: { fontSize: 13, color: Theme.primary, marginTop: 2, fontWeight: '600' },
  eventTime: { fontSize: 13, color: Theme.primary, marginTop: 2 },
  eventDuration: { fontSize: 13, color: Theme.secondary, marginTop: 2, fontWeight: '500' },
  eventCategory: { fontSize: 12, color: Theme.textSecondary, marginTop: 4 },
  eventParticipant: { fontSize: 12, color: Theme.primary, marginTop: 4, fontWeight: '600' },
  eventNotes: { fontSize: 13, color: Theme.textSecondary, marginTop: 6, fontStyle: 'italic' },
  chevron: { fontSize: 22, color: Theme.textSecondary },
  form: { gap: 4 },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  multiDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 12,
  },
  multiDayText: {
    flex: 1,
  },
  multiDayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text,
    marginBottom: 2,
  },
  multiDayDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dateField: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 8,
  },
  dateTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text,
  },
  dateChevron: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
  },
  dateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  dateMenu: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 12,
    overflow: 'hidden',
  },
  dateMenuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  dateDoneBtn: {
    marginTop: 12,
    marginHorizontal: 8,
    marginBottom: 4,
    backgroundColor: Theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dateDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  chipActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  chipText: { fontSize: 13, color: Theme.text, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
  saveBtn: {
    flex: 1,
    backgroundColor: Theme.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    paddingHorizontal: 20,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E57373',
  },
  deleteBtnText: { color: '#E57373', fontSize: 16, fontWeight: '600' },
});
