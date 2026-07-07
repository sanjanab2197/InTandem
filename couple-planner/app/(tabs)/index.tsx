import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CalendarGrid from '@/components/CalendarGrid';
import CycleCalendarPanel from '@/components/CycleCalendarPanel';
import CycleDaySheet from '@/components/CycleDaySheet';
import CyclePeriodEditSheet from '@/components/CyclePeriodEditSheet';
import EventCategoryManager from '@/components/EventCategoryManager';
import EventDetailModal from '@/components/EventDetailModal';
import ScheduleModeMenu, { ScheduleViewMode } from '@/components/ScheduleModeMenu';
import { Fonts, screenHeaderStyles } from '@/constants/Typography';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { CycleOwner } from '@/types';
import { cycleOwnerFromSlot } from '@/utils/cycleTracking';

export default function CalendarScreen() {
  const {
    events,
    loading,
    eventCategories,
    addEvent,
    updateEvent,
    deleteEvent,
    addEventCategory,
    updateEventCategory,
    deleteEventCategory,
    addEventSubcategory,
    updateEventSubcategory,
    deleteEventSubcategory,
    crossedOffDates,
    toggleCrossOffDate,
  } = useApp();
  const { couple } = useCouple();

  const [viewMode, setViewMode] = useState<ScheduleViewMode>('schedule');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scheduleDayOpen, setScheduleDayOpen] = useState(false);
  const [cycleDayOpen, setCycleDayOpen] = useState(false);
  const [cyclePeriodEditOpen, setCyclePeriodEditOpen] = useState(false);
  const [cycleDayOwner, setCycleDayOwner] = useState<CycleOwner>('partner1');
  const [manageCategories, setManageCategories] = useState(false);
  const navigation = useNavigation();

  const myOwner = cycleOwnerFromSlot(couple?.mySlot);
  const inDayView =
    viewMode === 'schedule'
      ? scheduleDayOpen && !!selectedDate
      : (cycleDayOpen || cyclePeriodEditOpen) && !!selectedDate;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: !inDayView });
  }, [navigation, inDayView]);

  const handleScheduleDayPress = (date: string) => {
    setSelectedDate(date);
    setScheduleDayOpen(true);
  };

  const handleCycleDayPress = (date: string, owner: CycleOwner) => {
    setSelectedDate(date);
    setCycleDayOwner(owner);
    setCycleDayOpen(true);
  };

  const handleCycleDayLongPress = (date: string, owner: CycleOwner) => {
    setSelectedDate(date);
    setCycleDayOwner(owner);
    setCycleDayOpen(false);
    setCyclePeriodEditOpen(true);
  };

  const closeDayView = () => {
    setScheduleDayOpen(false);
    setCycleDayOpen(false);
    setCyclePeriodEditOpen(false);
  };

  const handleModeChange = (mode: ScheduleViewMode) => {
    setViewMode(mode);
    closeDayView();
    setSelectedDate(null);
  };

  const handleSave = (event: Parameters<typeof addEvent>[0] & { id?: string }) => {
    if (event.id) {
      updateEvent(event as Parameters<typeof updateEvent>[0]);
    } else {
      addEvent(event);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  if (viewMode === 'cycle' && cyclePeriodEditOpen && selectedDate) {
    const readOnly = cycleDayOwner !== myOwner;
    return (
      <View style={styles.container}>
        <View style={styles.dayViewRoot}>
          <CyclePeriodEditSheet
            date={selectedDate}
            owner={cycleDayOwner}
            readOnly={readOnly}
            onClose={closeDayView}
          />
        </View>
      </View>
    );
  }

  if (viewMode === 'cycle' && cycleDayOpen && selectedDate) {
    const readOnly = cycleDayOwner !== myOwner;
    return (
      <View style={styles.container}>
        <View style={styles.dayViewRoot}>
          <CycleDaySheet
            date={selectedDate}
            owner={cycleDayOwner}
            readOnly={readOnly}
            onClose={closeDayView}
          />
        </View>
      </View>
    );
  }

  if (viewMode === 'schedule' && scheduleDayOpen && selectedDate) {
    return (
      <View style={styles.container}>
        <View style={styles.dayViewRoot}>
          <EventDetailModal
            visible
            date={selectedDate}
            onClose={closeDayView}
            onDateChange={setSelectedDate}
            onSave={handleSave}
            onDelete={deleteEvent}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScheduleModeMenu mode={viewMode} onModeChange={handleModeChange} />

        {viewMode === 'schedule' ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.editCategories, pressed && styles.editCategoriesPressed]}
              onPress={() => setManageCategories(true)}>
              <View style={styles.editCategoriesBody}>
                <Text style={styles.editCategoriesTitle}>Edit categories</Text>
                <Text style={styles.editCategoriesDesc}>
                  Customize event types and labels on your calendar
                </Text>
              </View>
              <Text style={styles.editCategoriesArrow}>›</Text>
            </Pressable>

            <CalendarGrid
              events={events}
              onDayPress={handleScheduleDayPress}
              onDayLongPress={toggleCrossOffDate}
              selectedDate={selectedDate ?? undefined}
              crossedOffDates={crossedOffDates}
              variant="schedule"
            />

            <Text style={[screenHeaderStyles.hint, screenHeaderStyles.hintOnly, styles.calendarHint]}>
              Tap a date for day view · Long-press a time to add an event · Long-press a day to cross off
            </Text>

            <View style={styles.legend}>
              {eventCategories.map((cat) => (
                <View key={cat.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.legendLabel}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <CycleCalendarPanel
            selectedDate={selectedDate ?? undefined}
            onDayPress={handleCycleDayPress}
            onDayLongPress={handleCycleDayLongPress}
          />
        )}
      </ScrollView>

      <EventCategoryManager
        visible={manageCategories}
        categories={eventCategories}
        onClose={() => setManageCategories(false)}
        onAddCategory={addEventCategory}
        onUpdateCategory={updateEventCategory}
        onDeleteCategory={deleteEventCategory}
        onAddSubcategory={addEventSubcategory}
        onUpdateSubcategory={updateEventSubcategory}
        onDeleteSubcategory={deleteEventSubcategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: Theme.background },
  dayViewRoot: { flex: 1, minHeight: 0, ...(Platform.OS === 'web' ? { height: '100%' as const } : {}) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.background },
  scroll: { padding: 20, paddingBottom: 40 },
  calendarHint: { marginTop: 12 },
  editCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  editCategoriesPressed: {
    backgroundColor: Theme.primaryLight,
    borderColor: 'rgba(135, 112, 198, 0.25)',
  },
  editCategoriesBody: {
    flex: 1,
    paddingRight: 8,
  },
  editCategoriesTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Theme.primaryDark,
    marginBottom: 2,
  },
  editCategoriesDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Theme.textSecondary,
    lineHeight: 17,
  },
  editCategoriesArrow: {
    fontSize: 22,
    fontFamily: Fonts.medium,
    color: Theme.primary,
    marginTop: -1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
});
