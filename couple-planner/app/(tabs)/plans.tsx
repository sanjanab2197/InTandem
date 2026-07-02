import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AiAgentView from '@/components/AiAgentView';
import AiMealView from '@/components/AiMealView';
import ChecklistListDropdown from '@/components/ChecklistListDropdown';
import ChecklistView from '@/components/ChecklistView';
import ExpenseflowView from '@/components/ExpenseflowView';
import KeyDatesView from '@/components/KeyDatesView';
import PlansHomeGrid from '@/components/PlansHomeGrid';
import PlanSectionHeader from '@/components/PlanSectionHeader';
import { useReminderRemoteActions } from '@/components/ReminderSync';
import RemindersView from '@/components/RemindersView';
import SubcategoryManager from '@/components/SubcategoryManager';
import TravelPlanView from '@/components/TravelPlanView';
import { getPlanTheme } from '@/constants/plansTheme';
import { PLAN_CATEGORIES, Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { PlanCategory } from '@/types';

export default function PlansScreen() {
  const { couple } = useCouple();
  const { syncAllToRemote, pushReminder, removeRemote } = useReminderRemoteActions();
  const {
    loading,
    addPlanItem,
    addPlanItemsBatch,
    updatePlanItem,
    togglePlanItem,
    deletePlanItem,
    clearCompletedPlanItems,
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
    addKeyDate,
    updateKeyDate,
    deleteKeyDate,
    planItems,
  } = useApp();
  const [category, setCategory] = useState<PlanCategory | null>(null);
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [manageSubcategories, setManageSubcategories] = useState(false);
  const [travelInDetail, setTravelInDetail] = useState(false);

  const isHome = category === null;
  const isChecklist = category === 'weekly_checklist';
  const isDateIdeas = category === 'date_ideas';
  const isEnrichment = category === 'enrichment_ideas';
  const isReminders = category === 'reminders';
  const isKeyDates = category === 'key_dates';
  const isAiAgent = category === 'ai_agent';
  const isAiMeal = category === 'ai_meal';
  const isExpenseflow = category === 'expenseflow';
  const isTravel = category === 'travel_ideas';
  const isStandaloneCategory = isReminders || isKeyDates || isAiAgent || isAiMeal || isExpenseflow;
  const usesStoreListUi = isChecklist || isDateIdeas || isEnrichment;
  const mySlot = couple?.mySlot ?? null;

  const subcategoryOptions = category && !isStandaloneCategory ? getPlanSubcategories(category) : [];
  const allInCategory = category ? getPlanItemsByCategory(category) : [];
  const categoryInfo = category ? PLAN_CATEGORIES.find((c) => c.key === category)! : null;
  const planTheme = category ? getPlanTheme(category) : getPlanTheme('weekly_checklist');
  const firstSubcategoryKey = subcategoryOptions[0]?.key;

  const groceryItems = useMemo(() => {
    return planItems
      .filter(
        (item) =>
          item.category === 'weekly_checklist' &&
          item.subcategory === 'groceries' &&
          !item.completed
      )
      .map((item) => item.text.trim())
      .filter(Boolean);
  }, [planItems]);

  const filteredItems = useMemo(() => {
    return allInCategory.filter((item) => {
      const subKey =
        item.subcategory === 'itinerary' || item.subcategory === 'ideas'
          ? 'places'
          : item.subcategory;
      const subOk =
        subcategoryFilter === 'all' ||
        subKey === subcategoryFilter ||
        (!subKey && subcategoryFilter === firstSubcategoryKey);
      return subOk;
    });
  }, [allInCategory, subcategoryFilter, firstSubcategoryKey]);

  const handleCategoryChange = (next: PlanCategory) => {
    setCategory(next);
    setSubcategoryFilter(
      next === 'weekly_checklist' || next === 'date_ideas' || next === 'enrichment_ideas' ? '' : 'all'
    );
  };

  const goToOrganizer = () => {
    setCategory(null);
    setSubcategoryFilter('');
    setManageSubcategories(false);
    setTravelInDetail(false);
  };

  const handleTravelViewChange = useCallback((view: 'grid' | 'detail') => {
    setTravelInDetail(view === 'detail');
  }, []);

  useEffect(() => {
    if (!usesStoreListUi) return;
    if (subcategoryOptions.length === 0) {
      if (subcategoryFilter) setSubcategoryFilter('');
      return;
    }
    if (!subcategoryOptions.some((s) => s.key === subcategoryFilter)) {
      setSubcategoryFilter(subcategoryOptions[0].key);
    }
  }, [usesStoreListUi, subcategoryOptions, subcategoryFilter]);

  const sectionHint = isChecklist
    ? 'Pick a list, add items, and check them off when done'
    : isTravel
    ? 'Tap a trip to organize places, packing, and budget'
    : isReminders
    ? 'Set shared reminders for you and your partner'
    : isKeyDates
    ? 'Save birthdays, anniversaries, and milestones you never want to forget'
    : isAiAgent
    ? 'Generate a couple travel itinerary with Gemini and save it to Travel Ideas'
    : isAiMeal
    ? 'Turn your Groceries checklist into a recipe and save it to Meals'
    : isExpenseflow
    ? 'Track shared expenses and settle up'
    : usesStoreListUi
    ? 'Pick a category, add ideas, and check them off when done'
    : 'Add and organize your ideas';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        {isHome ? (
          <PlansHomeGrid onSelect={handleCategoryChange} />
        ) : (
          <>
        {!(isTravel && travelInDetail) ? (
          <PlanSectionHeader
            category={category!}
            theme={planTheme}
            title={categoryInfo!.label}
            hint={sectionHint}
            onBack={goToOrganizer}
          />
        ) : null}

        {usesStoreListUi && subcategoryOptions.length > 0 && (
          <View style={styles.checklistSections}>
            <ChecklistListDropdown
              options={subcategoryOptions}
              selected={subcategoryFilter}
              onSelect={setSubcategoryFilter}
              onManageLists={() => setManageSubcategories(true)}
              theme={planTheme}
              menuTitle={isChecklist ? 'Lists' : 'Categories'}
              manageLabel={isChecklist ? '+ Add / edit list' : '+ Add / edit category'}
              placeholder={isChecklist ? 'Choose list' : 'Choose category'}
            />
          </View>
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
        ) : isKeyDates ? (
          <KeyDatesView
            theme={planTheme}
            addKeyDate={addKeyDate}
            updateKeyDate={updateKeyDate}
            deleteKeyDate={deleteKeyDate}
          />
        ) : isAiAgent ? (
          <AiAgentView
            theme={planTheme}
            onAddToTravel={(inputs) => addPlanItemsBatch('travel_ideas', inputs)}
            onOpenTravel={() => handleCategoryChange('travel_ideas')}
          />
        ) : isAiMeal ? (
          <AiMealView
            theme={planTheme}
            groceries={groceryItems}
            onAddToMeals={(inputs) => addPlanItemsBatch('weekly_checklist', inputs)}
            onOpenChecklist={() => {
              handleCategoryChange('weekly_checklist');
              setSubcategoryFilter('meals');
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
        ) : isTravel ? (
          <TravelPlanView
            items={allInCategory}
            theme={planTheme}
            sections={subcategoryOptions}
            onToggle={togglePlanItem}
            onAdd={(input) => addPlanItem(category!, input)}
            onEdit={updatePlanItem}
            onDelete={deletePlanItem}
            onClearCompleted={(tripName, sectionKey) =>
              clearCompletedPlanItems('travel_ideas', sectionKey, tripName)
            }
            onEditSections={() => setManageSubcategories(true)}
            onViewChange={handleTravelViewChange}
          />
        ) : usesStoreListUi && subcategoryOptions.length === 0 && isChecklist ? (
          <View style={styles.checklistEmpty}>
            <Text style={styles.checklistEmptyTitle}>No lists yet</Text>
            <Text style={styles.checklistEmptyBody}>
              Create lists like Groceries or Errands — only the ones you need.
            </Text>
            <Pressable
              style={[styles.checklistEmptyBtn, { backgroundColor: planTheme.accent }]}
              onPress={() => setManageSubcategories(true)}>
              <Text style={styles.checklistEmptyBtnText}>+ Add / edit list</Text>
            </Pressable>
          </View>
        ) : usesStoreListUi ? (
          <ChecklistView
            variant="store"
            items={filteredItems}
            category={category!}
            theme={planTheme}
            subcategoryOptions={subcategoryOptions}
            defaultSubcategoryKey={subcategoryFilter}
            sectionLabel={subcategoryOptions.find((s) => s.key === subcategoryFilter)?.label}
            onToggle={togglePlanItem}
            onAdd={(input) => addPlanItem(category!, input)}
            onEdit={updatePlanItem}
            onDelete={deletePlanItem}
            onClearCompleted={() => clearCompletedPlanItems(category!, subcategoryFilter)}
          />
        ) : null}
          </>
        )}
      </ScrollView>

      {category && !isStandaloneCategory && (
        <SubcategoryManager
          visible={manageSubcategories}
          categoryLabel={categoryInfo!.label}
          theme={planTheme}
          subcategories={subcategoryOptions}
          title={isChecklist ? 'Your lists' : isTravel ? 'Trip sections' : 'Categories'}
          subtitle={
            isChecklist
              ? 'Add or remove checklist tabs — e.g. Groceries, Errands. Delete any you do not need.'
              : isTravel
              ? 'Customize sections inside each trip — e.g. Camping gear, Packing, Budget. Add your own or rename any.'
              : 'Add or rename categories — e.g. Restaurants, Adventure. Delete any you do not need.'
          }
          addPlaceholder={
            isChecklist ? 'New list name' : isTravel ? 'New section name' : 'New category name'
          }
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.background },
  scroll: { padding: 20, paddingBottom: 40 },
  checklistSections: {
    marginBottom: 4,
  },
  checklistEmpty: {
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  checklistEmptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 8,
  },
  checklistEmptyBody: {
    fontSize: 15,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  checklistEmptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checklistEmptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
