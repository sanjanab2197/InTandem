import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CategoryDropdown from '@/components/CategoryDropdown';
import ChecklistView from '@/components/ChecklistView';
import ChipPicker from '@/components/ChipPicker';
import ExpenseflowView from '@/components/ExpenseflowView';
import { useReminderRemoteActions } from '@/components/ReminderSync';
import RemindersView from '@/components/RemindersView';
import SubcategoryManager from '@/components/SubcategoryManager';
import { getPlanTheme } from '@/constants/plansTheme';
import { PLAN_CATEGORIES, Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { PlanCategory } from '@/types';

const CATEGORY_HINTS: Record<PlanCategory, string> = {
  weekly_checklist: 'Shared tasks and routines — group by chores, meals, and more.',
  date_ideas: 'Your idea bank — restaurants, adventure, cozy nights in, and more.',
  travel_ideas: 'Plan trips with packing lists, places, itineraries, and budget notes.',
  enrichment_ideas: 'Books, courses, hobbies, and growth activities to explore together.',
  reminders: 'Set date & time reminders — notify yourself, your partner, or both.',
  expenseflow: 'Track shared expenses — split costs or record who owes whom.',
};

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const { couple } = useCouple();
  const { syncAllToRemote, removeRemote } = useReminderRemoteActions();
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
    completeReminder,
    addExpense,
    updateExpense,
    deleteExpense,
    settleExpense,
  } = useApp();
  const [category, setCategory] = useState<PlanCategory>('weekly_checklist');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
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

  const handleCategoryChange = (next: PlanCategory) => {
    setCategory(next);
    setSubcategoryFilter('all');
    setTagFilter('all');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>
            <Text style={styles.titleHighlight}>Planner</Text>
          </Text>
          <View style={styles.titleAccent}>
            <View style={[styles.accentMark, { backgroundColor: Theme.primary }]} />
            <View style={[styles.accentMark, { backgroundColor: Theme.love.rose }]} />
            <View style={[styles.accentMark, { backgroundColor: Theme.secondary }]} />
          </View>
          <Text style={styles.subtitle}>Shared plans, reminders, and expenses</Text>
        </View>

        <CategoryDropdown selected={category} onSelect={handleCategoryChange} />

        {!isStandaloneCategory && (
          <>
            <View style={styles.subcategoryHeader}>
              <ChipPicker
                label="Subcategory"
                options={subcategoryOptions}
                selected={subcategoryFilter}
                onSelect={setSubcategoryFilter}
                includeAll
                accentColor={planTheme.accent}
                accentLight={planTheme.accentLight}
              />
              <Pressable style={styles.manageBtn} onPress={() => setManageSubcategories(true)}>
                <Text style={[styles.manageBtnText, { color: planTheme.accentDark }]}>Edit subcategories</Text>
              </Pressable>
            </View>

            {availableTags.length > 0 && (
              <ChipPicker
                label="Filter by tag"
                options={availableTags.map((tag) => ({ key: tag, label: `#${tag}` }))}
                selected={tagFilter}
                onSelect={setTagFilter}
                includeAll
                accentColor={planTheme.accent}
                accentLight={planTheme.accentLight}
              />
            )}
          </>
        )}

        <View style={[styles.hintCard, { backgroundColor: planTheme.accentMuted, borderLeftColor: planTheme.accent }]}>
          <View style={[styles.hintIcon, { backgroundColor: planTheme.accentLight }]}>
            <Text style={styles.hintIconText}>{planTheme.icon}</Text>
          </View>
          <View style={styles.hintContent}>
            <Text style={[styles.hintTitle, { color: planTheme.accentDark }]}>{categoryInfo.label}</Text>
            <Text style={[styles.hintText, { color: planTheme.accentDark }]}>{CATEGORY_HINTS[category]}</Text>
          </View>
        </View>

        {isReminders ? (
          <RemindersView
            theme={planTheme}
            mySlot={mySlot}
            addReminder={(input) => addReminder(input, mySlot)}
            updateReminder={(reminder) => updateReminder(reminder, mySlot)}
            deleteReminder={deleteReminder}
            completeReminder={completeReminder}
            onSaved={syncAllToRemote}
            onDeleted={async (id) => {
              await removeRemote(id);
              await syncAllToRemote();
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
  header: { marginBottom: 16 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.8,
    fontFamily: 'Inter_700Bold',
    lineHeight: 38,
  },
  titleHighlight: { color: Theme.primary },
  titleAccent: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  accentMark: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: Theme.textSecondary,
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  subcategoryHeader: { marginTop: 4 },
  manageBtn: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 4, paddingVertical: 4 },
  manageBtnText: { fontSize: 13, fontWeight: '600', color: Theme.primary },
  hintCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    borderLeftWidth: 4,
    gap: 12,
  },
  hintIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintIconText: { fontSize: 18 },
  hintContent: { flex: 1 },
  hintTitle: { fontSize: 15, fontWeight: '700' },
  hintText: { fontSize: 13, marginTop: 3, opacity: 0.85, lineHeight: 18 },
});
