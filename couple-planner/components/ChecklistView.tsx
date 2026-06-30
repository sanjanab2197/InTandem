import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  formatTags,
  parseTags,
} from '@/constants/plans';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { AddPlanItemInput, PlanCategory, PlanItem, PlanSubcategory } from '@/types';

interface ChecklistViewProps {
  items: PlanItem[];
  category: PlanCategory;
  theme: PlanCategoryTheme;
  subcategoryOptions: PlanSubcategory[];
  defaultSubcategoryKey?: string;
  onToggle: (id: string) => void;
  onAdd: (input: AddPlanItemInput) => void;
  onEdit: (item: PlanItem) => void;
  onDelete: (id: string) => void;
}

export default function ChecklistView({
  items,
  category,
  theme,
  subcategoryOptions,
  defaultSubcategoryKey,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: ChecklistViewProps) {
  const showTripName = category === 'travel_ideas';
  const firstSubcategoryKey = subcategoryOptions[0]?.key ?? 'general';

  const labelForKey = (key?: string) =>
    subcategoryOptions.find((s) => s.key === key)?.label;

  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newTripName, setNewTripName] = useState('');
  const [addSubcategory, setAddSubcategory] = useState(
    defaultSubcategoryKey && defaultSubcategoryKey !== 'all'
      ? defaultSubcategoryKey
      : firstSubcategoryKey
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editTripName, setEditTripName] = useState('');
  const [editSubcategory, setEditSubcategory] = useState(firstSubcategoryKey);
  const [deleteTarget, setDeleteTarget] = useState<PlanItem | null>(null);

  useEffect(() => {
    if (defaultSubcategoryKey && defaultSubcategoryKey !== 'all') {
      setAddSubcategory(defaultSubcategoryKey);
    } else {
      setAddSubcategory(firstSubcategoryKey);
    }
  }, [defaultSubcategoryKey, category, firstSubcategoryKey]);

  const groupedItems = useMemo(() => {
    if (!showTripName) return [{ trip: null as string | null, items }];

    const map = new Map<string, PlanItem[]>();
    items.forEach((item) => {
      const trip = item.tripName?.trim() || 'General trip';
      const list = map.get(trip) ?? [];
      list.push(item);
      map.set(trip, list);
    });
    return Array.from(map.entries()).map(([trip, tripItems]) => ({ trip, items: tripItems }));
  }, [items, showTripName]);

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd({
      text: newText.trim(),
      subcategory: addSubcategory,
      tags: parseTags(newTags),
      tripName: showTripName ? newTripName.trim() || undefined : undefined,
    });
    setNewText('');
    setNewTags('');
  };

  const startEdit = (item: PlanItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditTags(formatTags(item.tags));
    setEditTripName(item.tripName ?? '');
    setEditSubcategory(item.subcategory ?? firstSubcategoryKey);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditTags('');
    setEditTripName('');
  };

  const saveEdit = (item: PlanItem) => {
    if (!editText.trim()) return;
    onEdit({
      ...item,
      text: editText.trim(),
      subcategory: editSubcategory,
      tags: parseTags(editTags),
      tripName: showTripName ? editTripName.trim() || undefined : item.tripName,
    });
    cancelEdit();
  };

  const openDeletePopup = (item: PlanItem) => {
    if (editingId === item.id) cancelEdit();
    setDeleteTarget(item);
  };

  const completed = items.filter((i) => i.completed).length;

  const accent = theme.accent;
  const accentDark = theme.accentDark;
  const accentLight = theme.accentLight;

  const renderItem = (item: PlanItem) => {
    const subLabel = labelForKey(item.subcategory);

    if (editingId === item.id) {
      return (
        <View key={item.id} style={[styles.editCard, { borderColor: accent }]}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            placeholder="Item text"
            placeholderTextColor={Theme.textSecondary}
          />
          <View style={styles.editChips}>
            {subcategoryOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.miniChip,
                  editSubcategory === opt.key && { backgroundColor: accentLight, borderColor: accent },
                ]}
                onPress={() => setEditSubcategory(opt.key)}>
                <Text
                  style={[
                    styles.miniChipText,
                    editSubcategory === opt.key && { color: accentDark, fontWeight: '700' },
                  ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {showTripName && (
            <TextInput
              style={styles.metaInput}
              value={editTripName}
              onChangeText={setEditTripName}
              placeholder="Trip name (e.g. Italy summer)"
              placeholderTextColor={Theme.textSecondary}
            />
          )}
          <TextInput
            style={styles.metaInput}
            value={editTags}
            onChangeText={setEditTags}
            placeholder="Tags (comma separated, optional)"
            placeholderTextColor={Theme.textSecondary}
          />
          <View style={styles.editActions}>
            <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={() => saveEdit(item)}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View key={item.id} style={[styles.row, PlansUI.cardShadow]}>
        <Pressable style={styles.checkArea} onPress={() => onToggle(item.id)}>
          <View
            style={[
              styles.checkbox,
              { borderColor: accent },
              item.completed && { backgroundColor: accent, borderColor: accent },
            ]}>
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.itemBody}>
            <Text style={[styles.itemText, item.completed && styles.itemTextDone]}>{item.text}</Text>
            {(subLabel || item.tags?.length || item.tripName) && (
              <View style={styles.metaRow}>
                {subLabel && (
                  <Text style={[styles.subBadge, { color: accentDark, backgroundColor: accentLight }]}>
                    {subLabel}
                  </Text>
                )}
                {item.tripName && showTripName && (
                  <Text style={styles.tripBadge}>{item.tripName}</Text>
                )}
                {item.tags?.map((tag) => (
                  <Text key={tag} style={styles.tagBadge}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => startEdit(item)}>
            <Text style={[styles.editLink, { color: accent }]}>Edit</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => openDeletePopup(item)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {items.length > 0 && (
        <Text style={[styles.progress, { color: accentDark }]}>
          {completed} of {items.length} completed
        </Text>
      )}

      {groupedItems.map(({ trip, items: tripItems }) => (
        <View key={trip ?? 'default'}>
          {showTripName && trip && groupedItems.length > 1 && (
            <Text style={[styles.tripHeader, { color: accentDark }]}>{trip}</Text>
          )}
          {tripItems.map(renderItem)}
        </View>
      ))}

      <View style={[styles.addCard, { borderColor: accentLight, backgroundColor: theme.accentMuted }]}>
        <Text style={[styles.addTitle, { color: accentDark }]}>Add item</Text>
        <View style={styles.addChips}>
          {subcategoryOptions.map((opt) => (
            <Pressable
              key={opt.key}
              style={[
                styles.miniChip,
                addSubcategory === opt.key && { backgroundColor: accentLight, borderColor: accent },
              ]}
              onPress={() => setAddSubcategory(opt.key)}>
              <Text
                style={[
                  styles.miniChipText,
                  addSubcategory === opt.key && { color: accentDark, fontWeight: '700' },
                ]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {showTripName && (
          <TextInput
            style={styles.metaInput}
            value={newTripName}
            onChangeText={setNewTripName}
            placeholder="Trip name (e.g. Japan 2026)"
            placeholderTextColor={Theme.textSecondary}
          />
        )}
        <TextInput
          style={styles.metaInput}
          value={newTags}
          onChangeText={setNewTags}
          placeholder="Tags — optional, comma separated (e.g. romantic, budget)"
          placeholderTextColor={Theme.textSecondary}
        />
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newText}
            onChangeText={setNewText}
            placeholder="What do you want to add?"
            placeholderTextColor={Theme.textSecondary}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <Pressable style={[styles.addBtn, { backgroundColor: accent }]} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <Text style={styles.popupTitle}>Delete item?</Text>
            <Text style={styles.popupMessage}>
              Remove "{deleteTarget?.text}" from the list? This can't be undone.
            </Text>
            <View style={styles.popupActions}>
              <Pressable style={styles.popupCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.popupCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.popupConfirm, { backgroundColor: PlansUI.delete }]}
                onPress={() => {
                  if (deleteTarget) onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}>
                <Text style={styles.popupConfirmText}>Confirm</Text>
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
  progress: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  tripHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  checkArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', minWidth: 0 },
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
  itemBody: { flex: 1 },
  itemText: { fontSize: 16, color: Theme.text, lineHeight: 22 },
  itemTextDone: { textDecorationLine: 'line-through', color: Theme.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  subBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
    backgroundColor: Theme.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
    backgroundColor: Theme.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actions: { flexDirection: 'row', gap: 2, paddingTop: 2 },
  actionBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  editLink: { fontSize: 13, fontWeight: '600' },
  deleteLink: { fontSize: 13, fontWeight: '600', color: PlansUI.delete },
  editCard: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  editInput: { fontSize: 16, color: Theme.text, padding: 4 },
  editChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  editActions: { flexDirection: 'row', gap: 8 },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cancelBtnText: { color: Theme.textSecondary, fontWeight: '600' },
  addCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  addTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  addChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  miniChipText: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },
  metaInput: {
    backgroundColor: Theme.background,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 8,
  },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
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
