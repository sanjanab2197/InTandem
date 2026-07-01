import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ChecklistListDropdown from '@/components/ChecklistListDropdown';
import ChecklistView from '@/components/ChecklistView';
import PlanSectionHeader from '@/components/PlanSectionHeader';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { AddPlanItemInput, PlanCategory, PlanItem, PlanSubcategory } from '@/types';

interface TravelPlanViewProps {
  items: PlanItem[];
  theme: PlanCategoryTheme;
  sections: PlanSubcategory[];
  onToggle: (id: string) => void;
  onAdd: (input: AddPlanItemInput) => void;
  onEdit: (item: PlanItem) => void;
  onDelete: (id: string) => void;
  onClearCompleted: (tripName: string, sectionKey: string) => void;
  onEditSections?: () => void;
  onViewChange?: (view: 'grid' | 'detail') => void;
}

function normalizeSection(key?: string): string {
  if (!key || key === 'ideas' || key === 'itinerary') return 'places';
  return key;
}

type TripSummary = { name: string };

export default function TravelPlanView({
  items,
  theme,
  sections,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onClearCompleted,
  onEditSections,
  onViewChange,
}: TravelPlanViewProps) {
  const accent = theme.accent;
  const accentDark = theme.accentDark;
  const accentLight = theme.accentLight;

  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [draftTrips, setDraftTrips] = useState<string[]>([]);
  const [sectionByTrip, setSectionByTrip] = useState<Record<string, string>>({});
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [editingTripName, setEditingTripName] = useState<string | null>(null);
  const [editTripNameText, setEditTripNameText] = useState('');
  const [deleteTripTarget, setDeleteTripTarget] = useState<string | null>(null);

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

  const firstSectionKey = sections[0]?.key ?? 'places';

  const getSectionForTrip = (tripName: string) => {
    const current = sectionByTrip[tripName];
    if (current && sections.some((s) => s.key === current)) return current;
    return firstSectionKey;
  };

  const setSectionForTrip = (tripName: string, key: string) => {
    setSectionByTrip((prev) => ({ ...prev, [tripName]: key }));
  };

  useEffect(() => {
    setSectionByTrip((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const { name } of tripSummaries) {
        const current = next[name];
        if (!current || !sections.some((s) => s.key === current)) {
          next[name] = firstSectionKey;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tripSummaries, sections, firstSectionKey]);

  useEffect(() => {
    if (selectedTrip && !tripSummaries.some((t) => t.name === selectedTrip)) {
      setSelectedTrip(null);
      setEditingTripName(null);
    }
  }, [selectedTrip, tripSummaries]);

  useEffect(() => {
    onViewChange?.(selectedTrip ? 'detail' : 'grid');
  }, [selectedTrip, onViewChange]);

  useEffect(() => {
    return () => onViewChange?.('grid');
  }, [onViewChange]);

  const itemsForTripSection = (tripName: string, sectionKey: string) =>
    items.filter((item) => {
      if (item.tripName?.trim() !== tripName) return false;
      return normalizeSection(item.subcategory) === sectionKey;
    });

  const confirmNewTrip = () => {
    const name = newTripName.trim();
    if (!name) return;
    setDraftTrips((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setNewTripName('');
    setShowNewTrip(false);
    setSelectedTrip(name);
  };

  const startEditTrip = (name: string) => {
    setEditingTripName(name);
    setEditTripNameText(name);
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
    setSectionByTrip((prev) => {
      if (!(oldName in prev)) return prev;
      const { [oldName]: section, ...rest } = prev;
      return { ...rest, [trimmed]: section };
    });
    if (selectedTrip === oldName) setSelectedTrip(trimmed);
    cancelEditTrip();
  };

  const confirmDeleteTrip = (name: string) => {
    items
      .filter((item) => item.tripName?.trim() === name)
      .forEach((item) => onDelete(item.id));
    setDraftTrips((prev) => prev.filter((n) => n !== name));
    setSectionByTrip((prev) => {
      if (!(name in prev)) return prev;
      const { [name]: _, ...rest } = prev;
      return rest;
    });
    if (selectedTrip === name) setSelectedTrip(null);
    setDeleteTripTarget(null);
  };

  const renderTripGrid = () => (
    <View style={styles.container}>
      {tripSummaries.length === 0 && !showNewTrip ? (
        <View style={[styles.emptyState, { borderColor: accentLight, backgroundColor: Theme.surface }]}>
          <Text style={[styles.emptyTitle, { color: accentDark }]}>No trips yet</Text>
          <Text style={styles.emptyHint}>Start with Japan, Spain, Camping — whatever you're planning next.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {tripSummaries.map((trip) => (
            <Pressable
              key={trip.name}
              style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}
              onPress={() => setSelectedTrip(trip.name)}>
              <View
                style={[
                  styles.gridCard,
                  PlansUI.cardShadow,
                  { backgroundColor: Theme.surface, borderColor: Theme.border },
                ]}>
                <Text style={styles.gridLabel} numberOfLines={3}>
                  {trip.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {showNewTrip ? (
        <View style={[styles.newTripCard, PlansUI.cardShadow, { borderColor: accentLight }]}>
          <Text style={[styles.newTripTitle, { color: accentDark }]}>New trip</Text>
          <TextInput
            style={[styles.newTripInput, { borderColor: accentLight }]}
            value={newTripName}
            onChangeText={setNewTripName}
            placeholder="e.g. Japan, Spain, Camping"
            placeholderTextColor={Theme.textSecondary}
            autoFocus
            onSubmitEditing={confirmNewTrip}
            returnKeyType="done"
          />
          <View style={styles.newTripActions}>
            <Pressable
              style={styles.tripMetaBtn}
              onPress={() => {
                setShowNewTrip(false);
                setNewTripName('');
              }}>
              <Text style={styles.tripMetaCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.tripMetaSave, { backgroundColor: accent }, !newTripName.trim() && styles.btnDisabled]}
              onPress={confirmNewTrip}
              disabled={!newTripName.trim()}>
              <Text style={styles.tripMetaSaveText}>Add trip</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={[styles.newTripRow, { borderColor: accentLight, backgroundColor: Theme.surface }]}
          onPress={() => setShowNewTrip(true)}>
          <Text style={[styles.newTripRowText, { color: accentDark }]}>+ New trip</Text>
        </Pressable>
      )}
    </View>
  );

  const renderTripDetail = (tripName: string) => {
    const sectionKey = getSectionForTrip(tripName);
    const sectionLabel = sections.find((s) => s.key === sectionKey)?.label;
    const tripItems = itemsForTripSection(tripName, sectionKey);

    if (editingTripName === tripName) {
      return (
        <View style={styles.container}>
          <PlanSectionHeader
            category="travel_ideas"
            theme={theme}
            title={tripName}
            hint="Rename this trip"
            onBack={() => {
              cancelEditTrip();
              setSelectedTrip(null);
            }}
            backLabel="← Trips"
          />
          <View style={[styles.editTripCard, PlansUI.cardShadow, { borderColor: accentLight }]}>
            <Text style={[styles.editTripTitle, { color: accentDark }]}>Rename trip</Text>
            <TextInput
              style={[styles.editTripInput, { borderColor: accentLight }]}
              value={editTripNameText}
              onChangeText={setEditTripNameText}
              placeholder="Trip name"
              placeholderTextColor={Theme.textSecondary}
              autoFocus
              onSubmitEditing={() => confirmRenameTrip(tripName)}
              returnKeyType="done"
            />
            <View style={styles.editTripActions}>
              <Pressable style={styles.tripMetaBtn} onPress={cancelEditTrip}>
                <Text style={styles.tripMetaCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.tripMetaSave, { backgroundColor: accent }, !editTripNameText.trim() && styles.btnDisabled]}
                onPress={() => confirmRenameTrip(tripName)}
                disabled={!editTripNameText.trim()}>
                <Text style={styles.tripMetaSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <PlanSectionHeader
          category="travel_ideas"
          theme={theme}
          title={tripName}
          hint="Pick a section, add items, and check them off when done"
          onBack={() => setSelectedTrip(null)}
          backLabel="← Trips"
          footer={
            <View style={styles.detailActions}>
              <Pressable style={styles.tripMetaBtn} onPress={() => startEditTrip(tripName)}>
                <Text style={[styles.tripMetaLink, { color: accent }]}>Rename</Text>
              </Pressable>
              <Pressable style={styles.tripMetaBtn} onPress={() => setDeleteTripTarget(tripName)}>
                <Text style={styles.tripMetaDelete}>Delete trip</Text>
              </Pressable>
            </View>
          }
        />

        {sections.length > 0 ? (
          <View style={styles.sectionDropdown}>
            <ChecklistListDropdown
              options={sections}
              selected={sectionKey}
              onSelect={(key) => setSectionForTrip(tripName, key)}
              onManageLists={() => onEditSections?.()}
              theme={theme}
              menuTitle="Sections"
              manageLabel="+ Add / edit section"
              placeholder="Choose section"
            />
          </View>
        ) : null}

        <ChecklistView
          variant="store"
          items={tripItems}
          category={'travel_ideas' as PlanCategory}
          theme={theme}
          subcategoryOptions={sections}
          defaultSubcategoryKey={sectionKey}
          defaultTripName={tripName}
          sectionLabel={sectionLabel}
          onToggle={onToggle}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          onClearCompleted={() => onClearCompleted(tripName, sectionKey)}
        />
      </View>
    );
  };

  return (
    <>
      {selectedTrip ? renderTripDetail(selectedTrip) : renderTripGrid()}

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
    </>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  cardWrap: {
    width: '50%',
    padding: 6,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  gridCard: {
    borderRadius: 18,
    padding: 16,
    minHeight: 88,
    borderWidth: 1,
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    color: Theme.text,
  },
  sectionDropdown: {
    marginBottom: 4,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripMetaBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  tripMetaLink: { fontSize: 13, fontWeight: '600' },
  tripMetaDelete: { fontSize: 13, fontWeight: '600', color: PlansUI.delete },
  tripMetaCancel: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary },
  tripMetaSave: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tripMetaSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editTripCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  editTripTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  editTripInput: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  editTripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    alignItems: 'center',
  },
  newTripRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
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
    marginBottom: 12,
  },
  newTripTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  newTripInput: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  newTripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyHint: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
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
