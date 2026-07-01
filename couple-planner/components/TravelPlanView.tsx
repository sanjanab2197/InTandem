import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ChipPicker from '@/components/ChipPicker';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { AddPlanItemInput, PlanItem, PlanSubcategory } from '@/types';

interface TravelPlanViewProps {
  items: PlanItem[];
  theme: PlanCategoryTheme;
  sections: PlanSubcategory[];
  onToggle: (id: string) => void;
  onAdd: (input: AddPlanItemInput) => void;
  onEdit: (item: PlanItem) => void;
  onDelete: (id: string) => void;
  onEditSections?: () => void;
}

function normalizeSection(key?: string): string {
  if (!key || key === 'ideas' || key === 'itinerary') return 'places';
  return key;
}

type TripSummary = {
  name: string;
};

export default function TravelPlanView({
  items,
  theme,
  sections,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onEditSections,
}: TravelPlanViewProps) {
  const accent = theme.accent;
  const accentDark = theme.accentDark;
  const accentLight = theme.accentLight;

  const [draftTrips, setDraftTrips] = useState<string[]>([]);

  const tripSummaries = useMemo((): TripSummary[] => {
    const names = new Set<string>();
    items.forEach((item) => {
      const name = item.tripName?.trim();
      if (name) names.add(name);
    });
    draftTrips.forEach((name) => names.add(name));
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name }));
  }, [items, draftTrips]);

  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addText, setAddText] = useState('');
  const [addSection, setAddSection] = useState(sections[0]?.key ?? 'places');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editSection, setEditSection] = useState(sections[0]?.key ?? 'places');
  const [deleteTarget, setDeleteTarget] = useState<PlanItem | null>(null);
  const [editingTripName, setEditingTripName] = useState<string | null>(null);
  const [editTripNameText, setEditTripNameText] = useState('');
  const [deleteTripTarget, setDeleteTripTarget] = useState<string | null>(null);

  const tripItems = useMemo(() => {
    if (!selectedTrip) return [];
    return items.filter((item) => item.tripName?.trim() === selectedTrip);
  }, [items, selectedTrip]);

  const filteredItems = useMemo(() => {
    if (sectionFilter === 'all') return tripItems;
    return tripItems.filter((item) => normalizeSection(item.subcategory) === sectionFilter);
  }, [tripItems, sectionFilter]);

  const sectionLabel = (key?: string) =>
    sections.find((s) => s.key === normalizeSection(key))?.label ??
    (key === 'itinerary' || key === 'ideas' ? 'Places to Visit' : key?.replace(/_/g, ' '));

  const openTrip = (name: string) => {
    setSelectedTrip(name);
    setSectionFilter('all');
    setShowAddForm(false);
    setEditingId(null);
  };

  const closeTrip = () => {
    setSelectedTrip(null);
    setSectionFilter('all');
    setShowAddForm(false);
    setEditingId(null);
  };

  const confirmNewTrip = () => {
    const name = newTripName.trim();
    if (!name) return;
    setDraftTrips((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setNewTripName('');
    setShowNewTrip(false);
    openTrip(name);
  };

  const startEditTrip = (name: string) => {
    setEditingTripName(name);
    setEditTripNameText(name);
    setShowNewTrip(false);
  };

  const cancelEditTrip = () => {
    setEditingTripName(null);
    setEditTripNameText('');
  };

  const confirmRenameTrip = (oldName: string) => {
    const trimmed = editTripNameText.trim();
    if (!trimmed || trimmed === oldName) {
      cancelEditTrip();
      return;
    }
    if (tripSummaries.some((t) => t.name === trimmed)) return;

    items
      .filter((item) => item.tripName?.trim() === oldName)
      .forEach((item) => onEdit({ ...item, tripName: trimmed }));
    setDraftTrips((prev) => {
      const next = prev.map((n) => (n === oldName ? trimmed : n));
      return next.filter((n, i) => next.indexOf(n) === i);
    });
    cancelEditTrip();
  };

  const confirmDeleteTrip = (name: string) => {
    items
      .filter((item) => item.tripName?.trim() === name)
      .forEach((item) => onDelete(item.id));
    setDraftTrips((prev) => prev.filter((n) => n !== name));
    setDeleteTripTarget(null);
  };

  const submitAdd = () => {
    if (!addText.trim() || !selectedTrip) return;
    onAdd({
      text: addText.trim(),
      subcategory: addSection,
      tripName: selectedTrip,
    });
    setAddText('');
    setShowAddForm(false);
  };

  const startEdit = (item: PlanItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditSection(normalizeSection(item.subcategory));
    setShowAddForm(false);
  };

  const saveEdit = (item: PlanItem) => {
    if (!editText.trim()) return;
    onEdit({
      ...item,
      text: editText.trim(),
      subcategory: editSection,
      tripName: selectedTrip ?? item.tripName,
    });
    setEditingId(null);
    setEditText('');
  };

  const renderItem = (item: PlanItem) => {
    if (editingId === item.id) {
      return (
        <View key={item.id} style={[styles.editCard, { borderColor: accentLight }]}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            placeholder="Item"
            placeholderTextColor={Theme.textSecondary}
          />
          <ChipPicker
            label="Section"
            options={sections}
            selected={editSection}
            onSelect={setEditSection}
            accentColor={accent}
            accentLight={accentLight}
          />
          <View style={styles.editActions}>
            <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={() => saveEdit(item)}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setEditingId(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={() => setDeleteTarget(item)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View key={item.id} style={[styles.itemRow, PlansUI.cardShadow]}>
        <Pressable style={styles.checkHit} onPress={() => onToggle(item.id)}>
          <View
            style={[
              styles.checkbox,
              { borderColor: accent },
              item.completed && { backgroundColor: accent, borderColor: accent },
            ]}>
            {item.completed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
        </Pressable>
        <Pressable style={styles.itemBody} onPress={() => startEdit(item)}>
          <Text style={[styles.itemText, item.completed && styles.itemDone]} numberOfLines={3}>
            {item.text}
          </Text>
          {sectionFilter === 'all' ? (
            <Text style={[styles.itemSection, { color: accentDark }]}>{sectionLabel(item.subcategory)}</Text>
          ) : null}
        </Pressable>
      </View>
    );
  };

  if (!selectedTrip) {
    return (
      <View style={styles.container}>
        <Text style={styles.listHeading}>Your trips</Text>
        <Text style={styles.listSubheading}>Tap a trip to open its packing, places, and budget.</Text>

        {tripSummaries.length === 0 && !showNewTrip ? (
          <View style={[styles.emptyState, { borderColor: accentLight }]}>
            <Text style={[styles.emptyTitle, { color: accentDark }]}>No trips yet</Text>
            <Text style={styles.emptyHint}>Start with Japan, Spain, Camping — whatever you're planning next.</Text>
          </View>
        ) : (
          <View style={styles.tripList}>
            {tripSummaries.map((trip) =>
              editingTripName === trip.name ? (
                <View key={trip.name} style={[styles.newTripCard, { borderColor: accentLight }]}>
                  <Text style={[styles.newTripTitle, { color: accentDark }]}>Rename trip</Text>
                  <TextInput
                    style={styles.newTripInput}
                    value={editTripNameText}
                    onChangeText={setEditTripNameText}
                    placeholder="Trip name"
                    placeholderTextColor={Theme.textSecondary}
                    autoFocus
                    onSubmitEditing={() => confirmRenameTrip(trip.name)}
                    returnKeyType="done"
                  />
                  <View style={styles.newTripActions}>
                    <Pressable style={styles.newTripCancel} onPress={cancelEditTrip}>
                      <Text style={styles.newTripCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.newTripBtn,
                        { backgroundColor: accent },
                        !editTripNameText.trim() && styles.btnDisabled,
                      ]}
                      onPress={() => confirmRenameTrip(trip.name)}
                      disabled={!editTripNameText.trim()}>
                      <Text style={styles.newTripBtnText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View key={trip.name} style={[styles.tripRow, PlansUI.cardShadow]}>
                  <Pressable
                    style={({ pressed }) => [styles.tripRowMain, pressed && { opacity: 0.85 }]}
                    onPress={() => openTrip(trip.name)}>
                    <View style={[styles.tripIcon, { backgroundColor: accentLight }]}>
                      <Text style={styles.tripIconText}>{theme.icon}</Text>
                    </View>
                    <View style={styles.tripRowBody}>
                      <Text style={styles.tripRowTitle}>{trip.name}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.tripRowActions}>
                    <Pressable style={styles.tripActionBtn} onPress={() => startEditTrip(trip.name)}>
                      <Text style={[styles.tripEditLink, { color: accent }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.tripActionBtn} onPress={() => setDeleteTripTarget(trip.name)}>
                      <Text style={styles.tripDeleteLink}>Delete</Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.tripChevronHit} onPress={() => openTrip(trip.name)}>
                    <Text style={[styles.tripChevron, { color: accent }]}>›</Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        )}

        {showNewTrip ? (
          <View style={[styles.newTripCard, { borderColor: accentLight }]}>
            <Text style={[styles.newTripTitle, { color: accentDark }]}>New trip</Text>
            <TextInput
              style={styles.newTripInput}
              value={newTripName}
              onChangeText={setNewTripName}
              placeholder="e.g. Japan, Spain, Camping"
              placeholderTextColor={Theme.textSecondary}
              autoFocus
              onSubmitEditing={confirmNewTrip}
              returnKeyType="done"
            />
            <View style={styles.newTripActions}>
              <Pressable style={styles.newTripCancel} onPress={() => setShowNewTrip(false)}>
                <Text style={styles.newTripCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.newTripBtn, { backgroundColor: accent }, !newTripName.trim() && styles.btnDisabled]}
                onPress={confirmNewTrip}
                disabled={!newTripName.trim()}>
                <Text style={styles.newTripBtnText}>Open trip</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[styles.newTripRow, { borderColor: accentLight }]}
            onPress={() => {
              setEditingTripName(null);
              setShowNewTrip(true);
            }}>
            <Text style={[styles.newTripRowText, { color: accentDark }]}>+ New</Text>
          </Pressable>
        )}

        <Modal
          visible={deleteTripTarget !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteTripTarget(null)}>
          <Pressable style={styles.overlay} onPress={() => setDeleteTripTarget(null)}>
            <Pressable style={styles.popup} onPress={() => {}}>
              <Text style={styles.popupTitle}>Delete trip?</Text>
              <Text style={styles.popupMessage}>
                Remove "{deleteTripTarget}" and all its items? This can't be undone.
              </Text>
              <View style={styles.popupActions}>
                <Pressable style={styles.popupCancel} onPress={() => setDeleteTripTarget(null)}>
                  <Text style={styles.popupCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.popupConfirm, { backgroundColor: PlansUI.delete }]}
                  onPress={() => {
                    if (deleteTripTarget) confirmDeleteTrip(deleteTripTarget);
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

  return (
    <View style={styles.container}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backBtn} onPress={closeTrip}>
          <Text style={[styles.backText, { color: accentDark }]}>← Trips</Text>
        </Pressable>
        <Text style={[styles.detailTitle, { color: accentDark }]}>{selectedTrip}</Text>
      </View>

      <View style={[styles.filtersBar, { borderColor: accentLight }]}>
        <ChipPicker
          label="Section"
          options={sections}
          selected={sectionFilter}
          onSelect={setSectionFilter}
          includeAll
          accentColor={accent}
          accentLight={accentLight}
        />
        {onEditSections ? (
          <Pressable style={styles.editSectionsBtn} onPress={onEditSections}>
            <Text style={[styles.editSectionsText, { color: accentDark }]}>Edit sections</Text>
          </Pressable>
        ) : null}
      </View>

      {!showAddForm ? (
        <Pressable
          style={({ pressed }) => [
            styles.addTrigger,
            { backgroundColor: theme.accentMuted, borderColor: accentLight },
            pressed && { backgroundColor: accentLight },
          ]}
          onPress={() => {
            setAddSection(sectionFilter !== 'all' ? sectionFilter : sections[0]?.key ?? 'places');
            setShowAddForm(true);
          }}>
          <View style={[styles.addIcon, { backgroundColor: accent }]}>
            <Text style={styles.addIconText}>+</Text>
          </View>
          <Text style={[styles.addTriggerText, { color: accentDark }]}>Add item</Text>
        </Pressable>
      ) : (
        <View style={[styles.addCard, PlansUI.cardShadow, { borderColor: accentLight }]}>
          <View style={styles.addCardHeader}>
            <Text style={[styles.addCardTitle, { color: accentDark }]}>New item</Text>
            <Pressable hitSlop={8} onPress={() => setShowAddForm(false)}>
              <Text style={styles.addCloseText}>×</Text>
            </Pressable>
          </View>
          <ChipPicker
            label="Section"
            options={sections}
            selected={addSection}
            onSelect={setAddSection}
            accentColor={accent}
            accentLight={accentLight}
          />
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { borderColor: accentLight }]}
              value={addText}
              onChangeText={setAddText}
              placeholder="What do you want to add?"
              placeholderTextColor={Theme.textSecondary}
              onSubmitEditing={submitAdd}
              returnKeyType="done"
              autoFocus
            />
            <Pressable
              style={[styles.addBtn, { backgroundColor: accent }, !addText.trim() && styles.btnDisabled]}
              onPress={submitAdd}
              disabled={!addText.trim()}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      )}

      {filteredItems.length === 0 ? (
        <Text style={styles.emptyItems}>
          {sectionFilter === 'all'
            ? 'Nothing in this trip yet — add your first item above.'
            : `No items in ${sections.find((s) => s.key === sectionFilter)?.label ?? 'this section'}.`}
        </Text>
      ) : (
        <View style={styles.itemList}>{filteredItems.map(renderItem)}</View>
      )}

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <Text style={styles.popupTitle}>Delete item?</Text>
            <Text style={styles.popupMessage}>
              Remove "{deleteTarget?.text}"? This can't be undone.
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
                  setEditingId(null);
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
  container: { marginTop: 8 },
  listHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 4,
  },
  listSubheading: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  tripList: { gap: 10, marginBottom: 12 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 8,
  },
  tripRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconText: { fontSize: 20 },
  tripRowBody: { flex: 1 },
  tripRowTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.text,
  },
  tripRowActions: { flexDirection: 'row', gap: 2 },
  tripActionBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  tripEditLink: { fontSize: 13, fontWeight: '600' },
  tripDeleteLink: { fontSize: 13, fontWeight: '600', color: PlansUI.delete },
  tripChevronHit: { paddingLeft: 2 },
  tripChevron: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  newTripRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Theme.surface,
  },
  newTripRowText: {
    fontSize: 15,
    fontWeight: '700',
  },
  newTripCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  newTripTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  newTripInput: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 12,
  },
  newTripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    alignItems: 'center',
  },
  newTripCancel: { paddingVertical: 10, paddingHorizontal: 8 },
  newTripCancelText: { fontSize: 15, fontWeight: '600', color: Theme.textSecondary },
  newTripBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  newTripBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.45 },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    backgroundColor: Theme.surface,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyHint: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailHeader: {
    marginBottom: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  filtersBar: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginBottom: 14,
  },
  editSectionsBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  editSectionsText: {
    fontSize: 13,
    fontWeight: '600',
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
  addCard: {
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    backgroundColor: Theme.surface,
    gap: 4,
  },
  addCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addCloseText: {
    fontSize: 22,
    color: Theme.textSecondary,
    lineHeight: 24,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyItems: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  itemList: { gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 10,
  },
  checkHit: { paddingTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemBody: { flex: 1 },
  itemText: { fontSize: 15, color: Theme.text, lineHeight: 21 },
  itemDone: { textDecorationLine: 'line-through', color: Theme.textSecondary },
  itemSection: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  editCard: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    gap: 4,
  },
  editInput: { fontSize: 15, color: Theme.text, padding: 4, marginBottom: 4 },
  editActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 9 },
  cancelBtnText: { color: Theme.textSecondary, fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 9 },
  deleteBtnText: { color: PlansUI.delete, fontWeight: '600', fontSize: 14 },
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
