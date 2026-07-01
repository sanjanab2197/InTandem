import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CategoryDropdown from '@/components/CategoryDropdown';
import ChecklistView from '@/components/ChecklistView';
import ChipPicker from '@/components/ChipPicker';
import ExpenseflowView from '@/components/ExpenseflowView';
import { useReminderRemoteActions } from '@/components/ReminderSync';
import RemindersView from '@/components/RemindersView';
import ScreenHeader from '@/components/ScreenHeader';
import SubcategoryManager from '@/components/SubcategoryManager';
import { getPlanTheme } from '@/constants/plansTheme';
import { PLAN_CATEGORIES, Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { PlanCategory } from '@/types';

export default function PlansScreen() {
  const { couple } = useCouple();
  const { syncAllToRemote, pushReminder, removeRemote } = useReminderRemoteActions();
  const {
    addPlanItem,
    updatePlanItem,
    togglePlanItem,
    deletePlanItem,
    getPlanItemsByCategory,
    getPlanSubcategories,
    addPlanSubcategory,
    updatePlanSubcategory,
    deletePlanSubcategory,
    addReminder,
    updateReminder,
    deleteReminder,
    addExpense,
    updateExpense,
    deleteExpense,
    settleExpense,
  } = useApp();
  const [category, setCategory] = useState<PlanCategory>('weekly_checklist');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [manageSubcategories, setManageSubcategories] = useState(false);

  const isReminders = category === 'reminders';
  const isExpenseflow = category === 'expenseflow';
  const isStandaloneCategory = isReminders || isExpenseflow;
  const mySlot = couple?.mySlot ?? null;

  const subcategoryOptions = isStandaloneCategory ? [] : getPlanSubcategories(category);
  const allInCategory = getPlanItemsByCategory(category);
  const categoryInfo = PLAN_CATEGORIES.find((c) => c.key === category)!;
  const planTheme = getPlanTheme(category);
  const firstSubcategoryKey = subcategoryOptions[0]?.key;

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    allInCategory.forEach((item) => item.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [allInCategory]);

  const filteredItems = useMemo(() => {
    return allInCategory.filter((item) => {
      const subOk =
        subcategoryFilter === 'all' ||
        item.subcategory === subcategoryFilter ||
        (!item.subcategory && subcategoryFilter === firstSubcategoryKey);
      const tagOk = tagFilter === 'all' || item.tags?.includes(tagFilter);
      return subOk && tagOk;
    });
  }, [allInCategory, subcategoryFilter, tagFilter, firstSubcategoryKey]);

  const hasActiveFilters = subcategoryFilter !== 'all' || tagFilter !== 'all';

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (subcategoryFilter !== 'all') {
      const label = subcategoryOptions.find((s) => s.key === subcategoryFilter)?.label;
      if (label) parts.push(label);
    }
    if (tagFilter !== 'all') parts.push(`#${tagFilter}`);
    return parts.join(' · ');
  }, [subcategoryFilter, tagFilter, subcategoryOptions]);

  const handleCategoryChange = (next: PlanCategory) => {
    setCategory(next);
    setSubcategoryFilter('all');
    setTagFilter('all');
    setShowFilters(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Planner"
          hint="Switch lists to track ideas, reminders, and expenses"
        />

        <CategoryDropdown selected={category} onSelect={handleCategoryChange} />

        {!isStandaloneCategory && (
          <>
            <Pressable style={styles.filtersToggle} onPress={() => setShowFilters(!showFilters)}>
              <Text style={styles.filtersToggleText}>
                {showFilters ? 'Hide filters' : 'Filter & organize'}
              </Text>
              {!showFilters && hasActiveFilters && (
                <Text style={[styles.filtersActive, { color: planTheme.accentDark }]}>
                  {activeFilterSummary}
                </Text>
              )}
              <Text style={[styles.filtersChevron, { color: Theme.primary }]}>
                {showFilters ? '▴' : '▾'}
              </Text>
            </Pressable>

            {showFilters && (
              <View style={styles.filtersPanel}>
                <ChipPicker
                  options={subcategoryOptions}
                  selected={subcategoryFilter}
                  onSelect={setSubcategoryFilter}
                  includeAll
                  accentColor={planTheme.accent}
                  accentLight={planTheme.accentLight}
                />
                {availableTags.length > 0 && (
                  <ChipPicker
                    options={availableTags.map((tag) => ({ key: tag, label: `#${tag}` }))}
                    selected={tagFilter}
                    onSelect={setTagFilter}
                    includeAll
                    accentColor={planTheme.accent}
                    accentLight={planTheme.accentLight}
                  />
                )}
                <Pressable style={styles.manageBtn} onPress={() => setManageSubcategories(true)}>
                  <Text style={[styles.manageBtnText, { color: planTheme.accentDark }]}>
                    Edit subcategories
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {isReminders ? (
          <RemindersView
            theme={planTheme}
            mySlot={mySlot}
            addReminder={(input) => addReminder(input, mySlot)}
            updateReminder={(reminder) => updateReminder(reminder, mySlot)}
            deleteReminder={deleteReminder}
            pushReminder={pushReminder}
            onSaved={syncAllToRemote}
            onDeleted={async (id) => {
              await removeRemote(id);
            }}
          />
        ) : isExpenseflow ? (
          <ExpenseflowView
            theme={planTheme}
            mySlot={mySlot}
            addExpense={addExpense}
            updateExpense={updateExpense}
            deleteExpense={deleteExpense}
            settleExpense={settleExpense}
          />
        ) : (
          <ChecklistView
            items={filteredItems}
            category={category}
            theme={planTheme}
            subcategoryOptions={subcategoryOptions}
            defaultSubcategoryKey={subcategoryFilter}
            onToggle={togglePlanItem}
            onAdd={(input) => addPlanItem(category, input)}
            onEdit={updatePlanItem}
            onDelete={deletePlanItem}
          />
        )}
      </ScrollView>

      {!isStandaloneCategory && (
        <SubcategoryManager
          visible={manageSubcategories}
          categoryLabel={categoryInfo.label}
          theme={planTheme}
          subcategories={subcategoryOptions}
          onClose={() => setManageSubcategories(false)}
          onAdd={(label) => addPlanSubcategory(category, label)}
          onUpdate={(key, label) => updatePlanSubcategory(category, key, label)}
          onDelete={(key) => deletePlanSubcategory(category, key)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  scroll: { padding: 20, paddingBottom: 40 },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filtersToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  filtersActive: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  filtersChevron: {
    fontSize: 11,
    fontWeight: '700',
  },
  filtersPanel: {
    marginTop: 2,
    marginBottom: 4,
  },
  manageBtn: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 4 },
  manageBtnText: { fontSize: 13, fontWeight: '600', color: Theme.primary },
});
