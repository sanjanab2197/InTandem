import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
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
  variant?: 'default' | 'store';
  embedded?: boolean;
  sectionLabel?: string;
  onToggle: (id: string) => void;
  onAdd: (input: AddPlanItemInput) => void;
  onEdit: (item: PlanItem) => void;
  onDelete: (id: string) => void;
  onClearCompleted?: () => void;
}

const SWIPE_DELETE_WIDTH = 72;

interface StoreSwipeRowProps {
  item: PlanItem;
  accent: string;
  accentDark: string;
  accentLight: string;
  accentMuted: string;
  isLast?: boolean;
  isOpen: boolean;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onDelete: () => void;
}

function StoreSwipeRow({
  item,
  accent,
  accentDark,
  accentLight,
  accentMuted,
  isLast = false,
  isOpen,
  isEditing,
  editText,
  onEditTextChange,
  onOpen,
  onClose,
  onToggle,
  onEditStart,
  onEditSave,
  onDelete,
}: StoreSwipeRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartX = useRef(0);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start();
      dragStartX.current = 0;
    }
  }, [isOpen, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 4,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 4,
      onPanResponderGrant: () => {
        translateX.stopAnimation((value) => {
          dragStartX.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(0, Math.max(-SWIPE_DELETE_WIDTH, dragStartX.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const projected = dragStartX.current + gesture.dx;
        const shouldOpen =
          projected <= -SWIPE_DELETE_WIDTH / 2 || (gesture.vx < -0.3 && projected < 0);

        if (shouldOpen) {
          Animated.spring(translateX, {
            toValue: -SWIPE_DELETE_WIDTH,
            useNativeDriver: true,
            friction: 8,
            tension: 80,
          }).start();
          dragStartX.current = -SWIPE_DELETE_WIDTH;
          onOpen();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 80,
          }).start();
          dragStartX.current = 0;
          onClose();
        }
      },
      onPanResponderTerminate: () => {
        const target = isOpenRef.current ? -SWIPE_DELETE_WIDTH : 0;
        Animated.spring(translateX, {
          toValue: target,
          useNativeDriver: true,
          friction: 8,
          tension: 80,
        }).start();
        dragStartX.current = target;
      },
    })
  ).current;

  const handleDeletePress = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
    dragStartX.current = 0;
    onClose();
    onDelete();
  };

  return (
    <View style={styles.storeSwipeContainer}>
      <View style={styles.storeSwipeDelete}>
        <Pressable style={styles.storeSwipeDeleteBtn} onPress={handleDeletePress}>
          <Text style={styles.storeSwipeDeleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[
          styles.storeSwipeForeground,
          { backgroundColor: item.completed ? accentMuted : Theme.surface },
          isEditing && { backgroundColor: accentLight },
          { transform: [{ translateX }] },
        ]}
        {...(isEditing ? {} : panResponder.panHandlers)}>
        <View style={[styles.storeRow, isLast && styles.storeRowLast, { borderBottomColor: Theme.border }]}>
          <Pressable style={styles.storeCheckBtn} onPress={onToggle} hitSlop={4} disabled={isEditing}>
            <View
              style={[
                styles.storeCheck,
                { borderColor: `${accent}66` },
                item.completed && { backgroundColor: accent, borderColor: accent },
              ]}
            />
          </Pressable>
          {isEditing ? (
            <TextInput
              style={[styles.storeEditInput, { color: Theme.text, borderColor: accent }]}
              value={editText}
              onChangeText={onEditTextChange}
              autoFocus
              selectTextOnFocus
              placeholder="Item name"
              placeholderTextColor={Theme.textSecondary}
              onSubmitEditing={onEditSave}
              onBlur={onEditSave}
              returnKeyType="done"
            />
          ) : (
            <Pressable
              style={styles.storeTextArea}
              onLongPress={onEditStart}
              delayLongPress={400}>
              <Text
                style={[
                  styles.storeItemText,
                  item.completed && { textDecorationLine: 'line-through', color: `${accentDark}99` },
                ]}
                numberOfLines={2}>
                {item.text}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export default function ChecklistView({
  items,
  category,
  theme,
  subcategoryOptions,
  defaultSubcategoryKey,
  defaultTripName,
  variant = 'default',
  embedded = false,
  sectionLabel,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onClearCompleted,
}: ChecklistViewProps) {
  const isStore = variant === 'store';
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
  const [storeEditId, setStoreEditId] = useState<string | null>(null);
  const [storeEditText, setStoreEditText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

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
  const accentMuted = theme.accentMuted;

  const storeItems = useMemo(() => {
    if (!isStore) return items;
    return [...items].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return 0;
    });
  }, [items, isStore]);

  const handleStoreAdd = () => {
    if (!newText.trim() || !addSubcategory) return;
    onAdd({
      text: newText.trim(),
      subcategory: addSubcategory,
      tripName: defaultTripName?.trim() || undefined,
    });
    setNewText('');
  };

  const startStoreEdit = (item: PlanItem) => {
    setOpenSwipeId(null);
    setStoreEditId(item.id);
    setStoreEditText(item.text);
  };

  const saveStoreEdit = () => {
    if (!storeEditId) return;
    const item = items.find((i) => i.id === storeEditId);
    const trimmed = storeEditText.trim();
    setStoreEditId(null);
    setStoreEditText('');
    if (!item || !trimmed || trimmed === item.text) return;
    onEdit({ ...item, text: trimmed });
  };

  const handleStoreDelete = (id: string) => {
    if (storeEditId === id) {
      setStoreEditId(null);
      setStoreEditText('');
    }
    setOpenSwipeId(null);
    onDelete(id);
  };

  if (isStore) {
    const canAdd = Boolean(addSubcategory);
    const progressPct = items.length ? (completed / items.length) * 100 : 0;
    const showProgress = items.length > 0 && completed > 0;

    return (
      <View style={embedded ? styles.storeEmbedded : [styles.storeCard, PlansUI.cardShadow]}>
        {showProgress ? (
          <View style={[styles.storeProgressTrack, { backgroundColor: accentLight }]}>
            <View
              style={[
                styles.storeProgressFill,
                { backgroundColor: accent, width: `${progressPct}%` },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.storeAddRow}>
          <TextInput
            style={styles.storeInput}
            value={newText}
            onChangeText={setNewText}
            placeholder="Add an item…"
            placeholderTextColor={Theme.textSecondary}
            onSubmitEditing={handleStoreAdd}
            returnKeyType="done"
            editable={canAdd}
          />
          <Pressable
            style={[
              styles.storeAddBtn,
              { backgroundColor: accent },
              (!newText.trim() || !canAdd) && styles.addBtnDisabled,
            ]}
            onPress={handleStoreAdd}
            disabled={!newText.trim() || !canAdd}>
            <Text style={styles.storeAddBtnIcon}>+</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.storeEmptyWrap}>
            <Text style={styles.storeEmptyTitle}>Nothing here yet</Text>
            <Text style={styles.storeEmpty}>Type above to add your first item.</Text>
          </View>
        ) : (
          <View style={styles.storeList}>
            {storeItems.map((item, index) => (
              <StoreSwipeRow
                key={item.id}
                item={item}
                accent={accent}
                accentDark={accentDark}
                accentLight={accentLight}
                accentMuted={accentMuted}
                isLast={index === storeItems.length - 1}
                isOpen={openSwipeId === item.id}
                isEditing={storeEditId === item.id}
                editText={storeEditId === item.id ? storeEditText : item.text}
                onEditTextChange={setStoreEditText}
                onOpen={() => setOpenSwipeId(item.id)}
                onClose={() => setOpenSwipeId((id) => (id === item.id ? null : id))}
                onToggle={() => onToggle(item.id)}
                onEditStart={() => startStoreEdit(item)}
                onEditSave={saveStoreEdit}
                onDelete={() => handleStoreDelete(item.id)}
              />
            ))}
          </View>
        )}

        {completed > 0 && onClearCompleted ? (
          <Pressable
            style={styles.clearDoneBtn}
            onPress={() => onClearCompleted()}>
            <Text style={[styles.clearDoneText, { color: accent }]}>
              Clear done
            </Text>
          </Pressable>
        ) : null}

        {items.length > 0 ? (
          <Text style={styles.storeHint}>
            Tap to check off · hold to edit · swipe left to delete
          </Text>
        ) : null}
      </View>
    );
  }

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
  storeCard: {
    marginTop: 8,
    borderRadius: 18,
    padding: 16,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  storeEmbedded: {
    marginTop: 0,
  },
  storeProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  storeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  storeAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    alignItems: 'center',
    borderRadius: 12,
    padding: 4,
    paddingLeft: 14,
    backgroundColor: Theme.background,
  },
  storeInput: {
    flex: 1,
    fontSize: 16,
    color: Theme.text,
    paddingVertical: 10,
  },
  storeAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeAddBtnIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 24,
    marginTop: -1,
  },
  storeAddBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  storeEmptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  storeEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text,
    marginBottom: 4,
  },
  storeList: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Theme.background,
  },
  storeSwipeContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  storeSwipeDelete: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SWIPE_DELETE_WIDTH,
    backgroundColor: PlansUI.delete,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeSwipeDeleteBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeSwipeDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  storeSwipeForeground: {
    backgroundColor: Theme.surface,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  storeRowLast: {
    borderBottomWidth: 0,
  },
  storeCheckBtn: {
    paddingVertical: 12,
    paddingRight: 14,
  },
  storeTextArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
    minWidth: 0,
  },
  storeEditInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: Theme.surface,
    minWidth: 0,
  },
  storeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    flexShrink: 0,
  },
  storeItemText: {
    flex: 1,
    fontSize: 16,
    color: Theme.text,
    lineHeight: 22,
  },
  storeEmpty: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  storeHint: {
    fontSize: 11,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 14,
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  clearDoneBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearDoneText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
