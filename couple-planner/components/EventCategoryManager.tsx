import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Theme } from '@/constants/Theme';
import { EventCategoryConfig, EventSubcategoryConfig } from '@/types';

interface EventCategoryManagerProps {
  visible: boolean;
  categories: EventCategoryConfig[];
  onClose: () => void;
  onAddCategory: (label: string) => void;
  onUpdateCategory: (key: string, label: string) => void;
  onDeleteCategory: (key: string) => void;
  onAddSubcategory: (categoryKey: string, label: string) => void;
  onUpdateSubcategory: (categoryKey: string, subKey: string, label: string) => void;
  onDeleteSubcategory: (categoryKey: string, subKey: string) => void;
}

export default function EventCategoryManager({
  visible,
  categories,
  onClose,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
}: EventCategoryManagerProps) {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<EventCategoryConfig | null>(null);
  const [deleteSubTarget, setDeleteSubTarget] = useState<{
    categoryKey: string;
    sub: EventSubcategoryConfig;
  } | null>(null);

  const selectedCategory = categories.find((c) => c.key === selectedCategoryKey);

  useEffect(() => {
    if (selectedCategoryKey && !selectedCategory) {
      setSelectedCategoryKey(null);
    }
  }, [selectedCategoryKey, selectedCategory]);

  const resetLocal = () => {
    setSelectedCategoryKey(null);
    setNewLabel('');
    setEditingKey(null);
    setEditLabel('');
  };

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    if (selectedCategory) {
      onAddSubcategory(selectedCategory.key, label);
    } else {
      onAddCategory(label);
    }
    setNewLabel('');
  };

  const startEdit = (key: string, label: string) => {
    setEditingKey(key);
    setEditLabel(label);
  };

  const saveEdit = () => {
    if (!editingKey || !editLabel.trim()) return;
    if (selectedCategory) {
      onUpdateSubcategory(selectedCategory.key, editingKey, editLabel.trim());
    } else {
      onUpdateCategory(editingKey, editLabel.trim());
    }
    setEditingKey(null);
    setEditLabel('');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditLabel('');
  };

  const renderRow = (
    key: string,
    label: string,
    color: string,
    builtIn?: boolean,
    onDelete?: () => void
  ) =>
    editingKey === key ? (
      <View key={key} style={styles.editRow}>
        <TextInput
          style={styles.editInput}
          value={editLabel}
          onChangeText={setEditLabel}
          autoFocus
          placeholder="Name"
          placeholderTextColor={Theme.textSecondary}
        />
        <Pressable style={styles.iconBtn} onPress={saveEdit}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={cancelEdit}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    ) : (
      <View key={key} style={styles.row}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <View style={styles.rowLabel}>
          <Text style={styles.rowText}>{label}</Text>
          {builtIn && <Text style={styles.defaultBadge}>Default</Text>}
        </View>
        <View style={styles.rowActions}>
          <Pressable style={styles.iconBtn} onPress={() => startEdit(key, label)}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          {onDelete && (
            <Pressable style={styles.iconBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          )}
          {!selectedCategory && (
            <Pressable style={styles.iconBtn} onPress={() => setSelectedCategoryKey(key)}>
              <Text style={styles.manageText}>Subs ›</Text>
            </Pressable>
          )}
        </View>
      </View>
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          {selectedCategory ? (
            <>
              <Pressable style={styles.backBtn} onPress={() => setSelectedCategoryKey(null)}>
                <Text style={styles.backText}>‹ All categories</Text>
              </Pressable>
              <Text style={styles.title}>Subcategories</Text>
              <Text style={styles.subtitle}>
                Groups within {selectedCategory.label} — used in stats charts and when logging events.
              </Text>
              <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.list}>
                  {selectedCategory.subcategories.map((sub) =>
                    renderRow(sub.key, sub.label, sub.color, sub.builtIn, () =>
                      setDeleteSubTarget({ categoryKey: selectedCategory.key, sub })
                    )
                  )}
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.title}>Stats categories</Text>
              <Text style={styles.subtitle}>
                Customize how you track progress. Defaults are included — add your own or rename any.
              </Text>
              <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.list}>
                  {categories.map((cat) =>
                    renderRow(cat.key, cat.label, cat.color, cat.builtIn, () =>
                      setDeleteCategoryTarget(cat)
                    )
                  )}
                </View>
              </ScrollView>
            </>
          )}

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder={
                selectedCategory ? 'New subcategory name' : 'New category name'
              }
              placeholderTextColor={Theme.textSecondary}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <Pressable style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <Pressable style={styles.doneBtn} onPress={handleClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <Modal
        visible={deleteCategoryTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteCategoryTarget(null)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setDeleteCategoryTarget(null)}>
          <Pressable style={styles.confirmPopup} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Delete category?</Text>
            <Text style={styles.confirmMessage}>
              Remove "{deleteCategoryTarget?.label}"? Events using it will move to the first category.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setDeleteCategoryTarget(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDelete}
                onPress={() => {
                  if (deleteCategoryTarget) onDeleteCategory(deleteCategoryTarget.key);
                  setDeleteCategoryTarget(null);
                }}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteSubTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteSubTarget(null)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setDeleteSubTarget(null)}>
          <Pressable style={styles.confirmPopup} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Delete subcategory?</Text>
            <Text style={styles.confirmMessage}>
              Remove "{deleteSubTarget?.sub.label}"? Events using it will move to the first subcategory.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setDeleteSubTarget(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDelete}
                onPress={() => {
                  if (deleteSubTarget) {
                    onDeleteSubcategory(deleteSubTarget.categoryKey, deleteSubTarget.sub.key);
                  }
                  setDeleteSubTarget(null);
                }}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '600', color: Theme.primary },
  title: { fontSize: 20, fontWeight: '800', color: Theme.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20, marginBottom: 12 },
  listScroll: { maxHeight: 320, marginBottom: 12 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  rowText: { fontSize: 15, fontWeight: '600', color: Theme.text, flexShrink: 1 },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.primaryDark,
    backgroundColor: Theme.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 2 },
  iconBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  editText: { fontSize: 13, fontWeight: '600', color: Theme.primary },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#E57373' },
  manageText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  saveText: { fontSize: 13, fontWeight: '700', color: Theme.primary },
  cancelText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Theme.primary,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: Theme.text,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addInput: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  addBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneBtn: {
    backgroundColor: Theme.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { color: Theme.primaryDark, fontWeight: '700', fontSize: 15 },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmPopup: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  confirmMessage: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: Theme.textSecondary },
  confirmDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#E57373',
  },
  confirmDeleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
