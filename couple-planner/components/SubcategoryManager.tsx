import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Theme } from '@/constants/Theme';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { PlanSubcategory } from '@/types';

interface SubcategoryManagerProps {
  visible: boolean;
  categoryLabel: string;
  theme?: PlanCategoryTheme;
  subcategories: PlanSubcategory[];
  title?: string;
  subtitle?: string;
  addPlaceholder?: string;
  onClose: () => void;
  onAdd: (label: string) => void;
  onUpdate: (key: string, label: string) => void;
  onDelete: (key: string) => void;
}

export default function SubcategoryManager({
  visible,
  categoryLabel,
  theme,
  subcategories,
  title = 'Subcategories',
  subtitle,
  addPlaceholder = 'New subcategory name',
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: SubcategoryManagerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PlanSubcategory | null>(null);

  const accent = theme?.accent ?? Theme.primary;
  const accentDark = theme?.accentDark ?? Theme.primaryDark;
  const accentLight = theme?.accentLight ?? Theme.primaryLight;
  const namePlaceholder = addPlaceholder.replace(/^New /, '');

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    onAdd(label);
    setNewLabel('');
  };

  const startEdit = (sub: PlanSubcategory) => {
    setEditingKey(sub.key);
    setEditLabel(sub.label);
  };

  const saveEdit = () => {
    if (!editingKey || !editLabel.trim()) return;
    onUpdate(editingKey, editLabel.trim());
    setEditingKey(null);
    setEditLabel('');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditLabel('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {subtitle ??
              `Customize groups for ${categoryLabel}. Defaults are included — add your own or rename any.`}
          </Text>

          <View style={styles.list}>
            {subcategories.map((sub) =>
              editingKey === sub.key ? (
                <View key={sub.key} style={[styles.editRow, { borderColor: accent }]}>
                  <TextInput
                    style={styles.editInput}
                    value={editLabel}
                    onChangeText={setEditLabel}
                    autoFocus
                    placeholder={namePlaceholder}
                    placeholderTextColor={Theme.textSecondary}
                  />
                  <Pressable style={styles.iconBtn} onPress={saveEdit}>
                    <Text style={[styles.saveText, { color: accent }]}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={cancelEdit}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View key={sub.key} style={styles.row}>
                  <View style={styles.rowLabel}>
                    <Text style={styles.rowText}>{sub.label}</Text>
                    {sub.builtIn && (
                      <Text style={[styles.defaultBadge, { color: accentDark, backgroundColor: accentLight }]}>
                        Default
                      </Text>
                    )}
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable style={styles.iconBtn} onPress={() => startEdit(sub)}>
                      <Text style={[styles.editText, { color: accent }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => setDeleteTarget(sub)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              )
            )}
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder={addPlaceholder}
              placeholderTextColor={Theme.textSecondary}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <Pressable style={[styles.addBtn, { backgroundColor: accent }]} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <Pressable style={[styles.doneBtn, { backgroundColor: accentLight }]} onPress={onClose}>
            <Text style={[styles.doneBtnText, { color: accentDark }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.confirmPopup} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Delete subcategory?</Text>
            <Text style={styles.confirmMessage}>
              Remove "{deleteTarget?.label}"? Items using it will move to the first subcategory.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmDelete, { backgroundColor: PlansUI.delete }]}
                onPress={() => {
                  if (deleteTarget) onDelete(deleteTarget.key);
                  setDeleteTarget(null);
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
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: Theme.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20, marginBottom: 16 },
  list: { gap: 8, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  rowLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  rowText: { fontSize: 15, fontWeight: '600', color: Theme.text, flexShrink: 1 },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  editText: { fontSize: 13, fontWeight: '600' },
  deleteText: { fontSize: 13, fontWeight: '600', color: PlansUI.delete },
  saveText: { fontSize: 13, fontWeight: '700' },
  cancelText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.5,
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
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { fontWeight: '700', fontSize: 15 },
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
  },
  confirmDeleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
