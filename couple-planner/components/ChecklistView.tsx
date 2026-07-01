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
  defaultTripName?: string;
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
  defaultTripName,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: ChecklistViewProps) {
  const showTripName = category === 'travel_ideas';
  const firstSubcategoryKey = subcategoryOptions[0]?.key ?? 'general';

  const travelSubKey = (key?: string) => {
    if (!key || key === 'itinerary') return 'ideas';
    return key;
  };

  const labelForKey = (key?: string) => {
    const normalized = showTripName ? travelSubKey(key) : key;
    return (
      subcategoryOptions.find((s) => s.key === normalized)?.label ??
      (key === 'itinerary' ? 'Ideas & Locations' : undefined)
    );
  };

  const tripLabel = (name?: string) => name?.trim() || 'Unnamed trip';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  useEffect(() => {
    if (defaultSubcategoryKey && defaultSubcategoryKey !== 'all') {
      setAddSubcategory(defaultSubcategoryKey);
    } else {
      setAddSubcategory(firstSubcategoryKey);
    }
  }, [defaultSubcategoryKey, category, firstSubcategoryKey]);

  useEffect(() => {
    if (defaultTripName) {
      setNewTripName(defaultTripName);
    }
  }, [defaultTripName]);

  const existingTrips = useMemo(() => {
    if (!showTripName) return [];
    const trips = new Set<string>();
    items.forEach((item) => {
      const name = item.tripName?.trim();
      if (name) trips.add(name);
    });
    return Array.from(trips).sort((a, b) => a.localeCompare(b));
  }, [items, showTripName]);

  const groupedItems = useMemo(() => {
    if (!showTripName) return [{ trip: null as string | null, items }];

    const trips = new Map<string, Map<string, PlanItem[]>>();
    items.forEach((item) => {
      const trip = tripLabel(item.tripName);
      const sub = travelSubKey(item.subcategory);
      if (!trips.has(trip)) trips.set(trip, new Map());
      const subMap = trips.get(trip)!;
      const list = subMap.get(sub) ?? [];
      list.push(item);
      subMap.set(sub, list);
    });

    const subOrder = subcategoryOptions.map((s) => s.key);

    return Array.from(trips.entries())
      .sort(([a], [b]) => {
        if (a === 'Unnamed trip') return 1;
        if (b === 'Unnamed trip') return -1;
        return a.localeCompare(b);
      })
      .map(([trip, subMap]) => {
        const knownSections = subOrder
          .map((key) => ({
            key,
            label: labelForKey(key) ?? key,
            items: subMap.get(key) ?? [],
          }))
          .filter((section) => section.items.length > 0);

        const extraSections = Array.from(subMap.entries())
          .filter(([key]) => !subOrder.includes(key))
          .map(([key, sectionItems]) => ({
            key,
            label: labelForKey(key) ?? key,
            items: sectionItems,
          }));

        return { trip, sections: [...knownSections, ...extraSections] };
      });
  }, [items, showTripName, subcategoryOptions]);

  const handleAdd = () => {
    if (!newText.trim()) return;
    if (showTripName && !newTripName.trim()) return;
    onAdd({
      text: newText.trim(),
      subcategory: addSubcategory,
      tags: parseTags(newTags),
      tripName: showTripName ? newTripName.trim() : undefined,
    });
    setNewText('');
    setNewTags('');
    if (!defaultTripName) setNewTripName('');
    setShowAddForm(false);
    setShowMoreOptions(false);
  };

  const startEdit = (item: PlanItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditTags(formatTags(item.tags));
    setEditTripName(item.tripName ?? '');
    setEditSubcategory(showTripName ? travelSubKey(item.subcategory) : (item.subcategory ?? firstSubcategoryKey));
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
      subcategory: showTripName ? travelSubKey(editSubcategory) : editSubcategory,
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

  const renderItem = (item: PlanItem, inTravelSection = false) => {
    const subLabel = inTravelSection ? undefined : labelForKey(item.subcategory);

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
            {(subLabel || (item.tags?.length ?? 0) > 0 || (item.tripName && !inTravelSection)) ? (
              <View style={styles.metaRow}>
                {subLabel ? (
                  <Text style={[styles.subBadge, { color: accentDark, backgroundColor: accentLight }]}>
                    {subLabel}
                  </Text>
                ) : null}
                {item.tripName && showTripName && !inTravelSection ? (
                  <Text style={styles.tripBadge}>{item.tripName}</Text>
                ) : null}
                {item.tags?.map((tag) => (
                  <Text key={tag} style={styles.tagBadge}>
                    #{tag}
                  </Text>
                ))}
              </View>
            ) : null}
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
        <View style={styles.progressBlock}>
          <View style={[styles.progressTrack, { backgroundColor: accentLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accent,
                  width: `${items.length ? (completed / items.length) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: accentDark }]}>
            {completed} of {items.length} done
          </Text>
        </View>
      )}

      {!showAddForm ? (
        <Pressable
          style={({ pressed }) => [
            styles.addTrigger,
            { backgroundColor: theme.accentMuted, borderColor: accentLight },
            pressed && { backgroundColor: accentLight },
          ]}
          onPress={() => setShowAddForm(true)}>
          <View style={[styles.addIcon, { backgroundColor: accent }]}>
            <Text style={styles.addIconText}>+</Text>
          </View>
          <Text style={[styles.addTriggerText, { color: accentDark }]}>Add item</Text>
        </Pressable>
      ) : (
        <View style={[styles.addCard, PlansUI.cardShadow, { borderColor: accentLight }]}>
          <View style={styles.addCardHeader}>
            <Text style={[styles.addCardTitle, { color: accentDark }]}>New item</Text>
            <Pressable
              hitSlop={8}
              style={styles.addCloseBtn}
              onPress={() => {
                setShowAddForm(false);
                setShowMoreOptions(false);
              }}>
              <Text style={styles.addCloseText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { borderColor: accentLight }]}
              value={newText}
              onChangeText={setNewText}
              placeholder="What do you want to add?"
              placeholderTextColor={Theme.textSecondary}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              autoFocus
            />
            <Pressable
              style={[
                styles.addBtn,
                { backgroundColor: accent },
                (!newText.trim() || (showTripName && !newTripName.trim())) && styles.addBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!newText.trim() || (showTripName && !newTripName.trim())}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          {showTripName ? (
            <>
              <Text style={[styles.fieldLabel, { color: accentDark }]}>Trip</Text>
              <TextInput
                style={[styles.metaInput, styles.tripInput]}
                value={newTripName}
                onChangeText={setNewTripName}
                placeholder="Trip name (e.g. Japan 2026)"
                placeholderTextColor={Theme.textSecondary}
              />
              {existingTrips.length > 0 ? (
                <View style={styles.tripChips}>
                  {existingTrips.map((trip) => (
                    <Pressable
                      key={trip}
                      style={[
                        styles.tripChip,
                        newTripName.trim() === trip && {
                          backgroundColor: accentLight,
                          borderColor: accent,
                        },
                      ]}
                      onPress={() => setNewTripName(trip)}>
                      <Text
                        style={[
                          styles.tripChipText,
                          newTripName.trim() === trip && { color: accentDark, fontWeight: '700' },
                        ]}>
                        {trip}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.fieldLabel, { color: accentDark }]}>Section</Text>
              <View style={styles.addChips}>
                {subcategoryOptions.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.miniChip,
                      addSubcategory === opt.key && {
                        backgroundColor: accentLight,
                        borderColor: accent,
                      },
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
            </>
          ) : subcategoryOptions.length > 1 ? (
            <View style={styles.addChips}>
              {subcategoryOptions.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.miniChip,
                    addSubcategory === opt.key && {
                      backgroundColor: accentLight,
                      borderColor: accent,
                    },
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
          ) : null}
          {!showTripName && (showMoreOptions || newTags.trim().length > 0) ? (
            <View style={styles.addExtras}>
              <TextInput
                style={styles.metaInput}
                value={newTags}
                onChangeText={setNewTags}
                placeholder="Tags — comma separated"
                placeholderTextColor={Theme.textSecondary}
              />
            </View>
          ) : null}
          {showTripName && (showMoreOptions || newTags.trim().length > 0) ? (
            <View style={styles.addExtras}>
              <TextInput
                style={styles.metaInput}
                value={newTags}
                onChangeText={setNewTags}
                placeholder="Tags — comma separated"
                placeholderTextColor={Theme.textSecondary}
              />
            </View>
          ) : null}
          {!showMoreOptions ? (
            <Pressable onPress={() => setShowMoreOptions(true)}>
              <Text style={[styles.moreLink, { color: accent }]}>
                {showTripName ? 'Add tags' : 'Tags & details'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {showTripName
        ? groupedItems.map(({ trip, sections }) => (
            <View key={trip} style={styles.tripBlock}>
              <View style={[styles.tripHeaderRow, { borderColor: accentLight }]}>
                <Text style={[styles.tripHeader, { color: accentDark }]}>{trip}</Text>
              </View>
              {sections.map(({ key, label, items: sectionItems }) => (
                <View key={`${trip}-${key}`} style={styles.subSection}>
                  <Text style={[styles.subSectionHeader, { color: accent }]}>{label}</Text>
                  {sectionItems.map((item) => renderItem(item, true))}
                </View>
              ))}
            </View>
          ))
        : groupedItems.map(({ trip, items: tripItems }) => (
            <View key={trip ?? 'default'}>
              {tripItems.map((item) => renderItem(item, false))}
            </View>
          ))}

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
  container: { marginTop: 12 },
  progressBlock: {
    marginBottom: 12,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripHeader: {
    fontSize: 18,
    fontWeight: '800',
  },
  tripBlock: {
    marginBottom: 16,
  },
  tripHeaderRow: {
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  subSection: {
    marginTop: 10,
  },
  subSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  tripInput: {
    marginBottom: 8,
  },
  tripChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tripChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  tripChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.textSecondary,
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
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    backgroundColor: Theme.surface,
  },
  addExtras: {
    gap: 0,
  },
  addCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background,
  },
  addCloseText: {
    fontSize: 20,
    lineHeight: 22,
    color: Theme.textSecondary,
    fontWeight: '400',
    marginTop: -1,
  },
  addTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: -1,
  },
  addTriggerText: { fontSize: 16, fontWeight: '600' },
  moreLink: { fontSize: 13, fontWeight: '600' },
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
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
