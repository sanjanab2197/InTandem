import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import CalendarDatePicker from '@/components/CalendarDatePicker';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { AddKeyDateInput, KeyDate, KeyDateKind, Participant } from '@/types';
import {
  formatCountdown,
  formatKeyDateLong,
  formatKeyDateShort,
  getDaysUntil,
  KEY_DATE_KIND_META,
  KEY_DATE_KINDS,
  sortKeyDatesByUpcoming,
  whomLabel,
  yearsSince,
} from '@/utils/keyDates';
import { firstName } from '@/utils/participant';

interface KeyDatesViewProps {
  theme: PlanCategoryTheme;
  addKeyDate: (input: AddKeyDateInput) => void;
  updateKeyDate: (item: KeyDate) => void;
  deleteKeyDate: (id: string) => void;
}

const WHOM_OPTIONS: { key: Participant; label: string }[] = [
  { key: 'partner1', label: 'Partner 1' },
  { key: 'partner2', label: 'Partner 2' },
  { key: 'together', label: 'Both of us' },
];

export default function KeyDatesView({
  theme,
  addKeyDate,
  updateKeyDate,
  deleteKeyDate,
}: KeyDatesViewProps) {
  const { profile, keyDates } = useApp();
  const { accent, accentDark, accentLight, accentMuted } = theme;

  const p1Name = firstName(profile.partner1Name);
  const p2Name = firstName(profile.partner2Name);

  const sorted = useMemo(() => sortKeyDatesByUpcoming(keyDates), [keyDates]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KeyDate | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<KeyDateKind>('birthday');
  const [forWhom, setForWhom] = useState<Participant>('together');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [giftIdeas, setGiftIdeas] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState(() => new Date());

  const resetForm = () => {
    setTitle('');
    setKind('birthday');
    setForWhom('together');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setGiftIdeas('');
    setEditing(null);
    setDateOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: KeyDate) => {
    setEditing(item);
    setTitle(item.title);
    setKind(item.kind);
    setForWhom(item.forWhom);
    setDate(item.date);
    setNotes(item.notes ?? '');
    setGiftIdeas(item.giftIdeas ?? '');
    setShowForm(true);
    setDateOpen(false);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Add a title', 'Give this date a name — e.g. Our anniversary.');
      return;
    }
    const payload = {
      title: trimmed,
      date,
      kind,
      forWhom,
      notes: notes.trim() || undefined,
      giftIdeas: giftIdeas.trim() || undefined,
    };
    if (editing) {
      updateKeyDate({ ...editing, ...payload });
    } else {
      addKeyDate(payload);
    }
    closeForm();
  };

  const confirmDelete = (item: KeyDate) => {
    Alert.alert('Remove date?', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteKeyDate(item.id) },
    ]);
  };

  const renderCard = (item: KeyDate) => {
    const meta = KEY_DATE_KIND_META[item.kind];
    const days = getDaysUntil(item.date);
    const years = yearsSince(item.date);
    const isToday = days === 0;

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.card, PlansUI.cardShadow, pressed && styles.cardPressed]}
        onPress={() => openEdit(item)}
        onLongPress={() => confirmDelete(item)}>
        <View style={[styles.emojiWrap, { backgroundColor: accentLight }]}>
          <Text style={styles.emoji}>{meta.emoji}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                styles.countdownPill,
                { backgroundColor: isToday ? accent : accentLight },
              ]}>
              <Text style={[styles.countdownText, { color: isToday ? '#fff' : accentDark }]}>
                {formatCountdown(days)}
              </Text>
            </View>
          </View>

          <Text style={styles.cardDate}>{formatKeyDateLong(item.date)}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.kindChip, { borderColor: accentLight }]}>
              <Text style={[styles.kindChipText, { color: accentDark }]}>{meta.label}</Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.whomText}>{whomLabel(item.forWhom, p1Name, p2Name)}</Text>
            {years != null && years > 0 ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.yearsText}>
                  {years} {years === 1 ? 'year' : 'years'}
                </Text>
              </>
            ) : null}
          </View>

          {item.notes ? (
            <Text style={styles.cardNote} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}

          {item.giftIdeas ? (
            <View style={[styles.giftRow, { backgroundColor: accentMuted }]}>
              <Text style={styles.giftLabel}>Gift ideas</Text>
              <Text style={styles.giftText} numberOfLines={2}>
                {item.giftIdeas}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {sorted.length === 0 && !showForm ? (
        <View style={[styles.emptyCard, { borderColor: accentLight, backgroundColor: accentMuted }]}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={[styles.emptyTitle, { color: accentDark }]}>Never miss a moment</Text>
          <Text style={styles.emptyBody}>
            Save birthdays, anniversaries, and the little milestones that matter to you both.
          </Text>
        </View>
      ) : (
        sorted.map(renderCard)
      )}

      {!showForm ? (
        <Pressable
          style={[styles.addTrigger, { borderColor: accentLight }]}
          onPress={openCreate}>
          <Text style={[styles.addTriggerText, { color: accent }]}>+ Add key date</Text>
        </Pressable>
      ) : (
        <View style={[styles.formCard, { borderColor: accentLight, backgroundColor: accentMuted }]}>
          <Text style={[styles.formTitle, { color: accentDark }]}>
            {editing ? 'Edit key date' : 'New key date'}
          </Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Title — e.g. Our anniversary"
            placeholderTextColor={Theme.textSecondary}
          />

          <Text style={styles.fieldLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kindScroll}>
            <View style={styles.kindRow}>
              {KEY_DATE_KINDS.map((k) => {
                const meta = KEY_DATE_KIND_META[k];
                const selected = kind === k;
                return (
                  <Pressable
                    key={k}
                    style={[
                      styles.kindOption,
                      { borderColor: accentLight },
                      selected && { backgroundColor: accentLight, borderColor: accent },
                    ]}
                    onPress={() => setKind(k)}>
                    <Text style={styles.kindEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.kindLabel, selected && { color: accentDark, fontWeight: '700' }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>Date</Text>
          <Pressable
            style={[
              styles.dateBtn,
              dateOpen && { borderColor: accent, backgroundColor: accentLight },
            ]}
            onPress={() => {
              setPickerDraft(parseISO(date));
              setDateOpen((v) => !v);
            }}>
            <Text style={styles.dateBtnText}>{formatKeyDateShort(date)}</Text>
            <Text style={[styles.chevron, { color: accent }]}>{dateOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {dateOpen ? (
            <View style={[styles.dropdown, { borderColor: accentLight }]}>
              <CalendarDatePicker
                value={pickerDraft}
                onChange={(d) => {
                  setPickerDraft(d);
                  setDate(format(d, 'yyyy-MM-dd'));
                }}
              />
              <Pressable
                style={[styles.dropdownDone, { backgroundColor: accent }]}
                onPress={() => setDateOpen(false)}>
                <Text style={styles.dropdownDoneText}>Done</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Who is it for?</Text>
          <View style={styles.chipRow}>
            {WHOM_OPTIONS.map(({ key, label }) => {
              const selected = forWhom === key;
              const display =
                key === 'partner1' ? p1Name : key === 'partner2' ? p2Name : label;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.chip,
                    { borderColor: accentLight },
                    selected && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setForWhom(key)}>
                  <Text style={[styles.chipText, selected && styles.chipTextOn]}>{display}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How you like to celebrate, traditions…"
            placeholderTextColor={Theme.textSecondary}
            multiline
          />

          <Text style={styles.fieldLabel}>Gift ideas (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={giftIdeas}
            onChangeText={setGiftIdeas}
            placeholder="Wishlist hints for your partner"
            placeholderTextColor={Theme.textSecondary}
            multiline
          />

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={closeForm}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editing ? 'Save changes' : 'Save date'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 12,
  },
  cardPressed: { opacity: 0.92 },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 24 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    lineHeight: 20,
  },
  countdownPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  countdownText: { fontSize: 12, fontWeight: '700' },
  cardDate: {
    fontSize: 14,
    color: Theme.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kindChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindChipText: { fontSize: 11, fontWeight: '600' },
  metaDot: { color: Theme.textSecondary, fontSize: 12 },
  whomText: { fontSize: 12, color: Theme.textSecondary, fontWeight: '500' },
  yearsText: { fontSize: 12, color: Theme.textSecondary, fontWeight: '500' },
  cardNote: {
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  giftRow: {
    marginTop: 8,
    borderRadius: 10,
    padding: 10,
  },
  giftLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  giftText: { fontSize: 13, color: Theme.text, lineHeight: 18 },
  addTrigger: {
    marginTop: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addTriggerText: { fontSize: 15, fontWeight: '700' },
  formCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.text,
    marginBottom: 12,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  kindScroll: { marginBottom: 12 },
  kindRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  kindOption: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 88,
    backgroundColor: Theme.surface,
  },
  kindEmoji: { fontSize: 20, marginBottom: 4 },
  kindLabel: { fontSize: 12, color: Theme.textSecondary, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: Theme.text },
  chevron: { fontSize: 12, fontWeight: '700' },
  dropdown: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    marginTop: -4,
  },
  dropdownDone: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dropdownDoneText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Theme.surface,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  chipTextOn: { color: '#fff' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  cancelBtnText: { color: Theme.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
