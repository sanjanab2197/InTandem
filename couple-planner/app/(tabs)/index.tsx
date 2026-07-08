import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CalendarGrid from '@/components/CalendarGrid';
import CycleCalendarPanel from '@/components/CycleCalendarPanel';
import CycleDaySheet from '@/components/CycleDaySheet';
import CycleSaveBanner from '@/components/CycleSaveBanner';
import EventCategoryManager from '@/components/EventCategoryManager';
import EventDetailModal from '@/components/EventDetailModal';
import ScheduleCycleToggle from '@/components/ScheduleModeMenu';
import { useCycleCalendarView } from '@/components/useCycleCalendarView';
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
    cycleSaveStatus,
  } = useApp();
  const { couple } = useCouple();

  const [showCycleHealth, setShowCycleHealth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scheduleDayOpen, setScheduleDayOpen] = useState(false);
  const [cycleDayOpen, setCycleDayOpen] = useState(false);
  const [cycleDayOwner, setCycleDayOwner] = useState<CycleOwner>('partner1');
  const [manageCategories, setManageCategories] = useState(false);
  const navigation = useNavigation();

  const cycleView = useCycleCalendarView(selectedDate ?? undefined);
  const myOwner = cycleOwnerFromSlot(couple?.mySlot);
  const inDayView = showCycleHealth
    ? cycleDayOpen && !!selectedDate
    : scheduleDayOpen && !!selectedDate;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: !inDayView });
  }, [navigation, inDayView]);

  const handleScheduleDayPress = (date: string) => {
    setSelectedDate(date);
    setScheduleDayOpen(true);
  };

  const handleCycleDayPress = (date: string) => {
    setSelectedDate(date);
    setCycleDayOwner(cycleView.activeOwner);
  };

  const handleCycleDayLongPress = (date: string) => {
    setSelectedDate(date);
    setCycleDayOwner(cycleView.activeOwner);
    setCycleDayOpen(true);
  };

  const closeDayView = () => {
    setScheduleDayOpen(false);
    setCycleDayOpen(false);
  };

  const handleToggleCycle = (enabled: boolean) => {
    setShowCycleHealth(enabled);
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

  if (showCycleHealth && cycleDayOpen && selectedDate) {
    const readOnly = cycleDayOwner !== myOwner;
    return (
      <View style={styles.container}>
        <View style={styles.dayViewRoot}>
          <CycleDaySheet
            date={selectedDate}
            owner={cycleDayOwner}
            readOnly={readOnly}
            onClose={closeDayView}
            onDateChange={setSelectedDate}
          />
        </View>
        {cycleSaveStatus !== 'idle' ? <CycleSaveBanner status={cycleSaveStatus} /> : null}
      </View>
    );
  }

  if (!showCycleHealth && scheduleDayOpen && selectedDate) {
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
        <ScheduleCycleToggle enabled={showCycleHealth} onEnabledChange={handleToggleCycle} />

        {showCycleHealth ? (
          <CycleCalendarPanel cycle={cycleView} placement="header" />
        ) : (
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
        )}

        <CalendarGrid
          events={showCycleHealth ? [] : events}
          variant={showCycleHealth ? 'cycle' : 'schedule'}
          cycleMarkers={showCycleHealth ? cycleView.cycleMarkers : undefined}
          selectedDate={selectedDate ?? undefined}
          visibleMonth={showCycleHealth ? cycleView.visibleMonth : undefined}
          onVisibleMonthChange={showCycleHealth ? cycleView.setVisibleMonth : undefined}
          crossedOffDates={showCycleHealth ? undefined : crossedOffDates}
          onDayPress={showCycleHealth ? handleCycleDayPress : handleScheduleDayPress}
          onDayLongPress={showCycleHealth ? handleCycleDayLongPress : toggleCrossOffDate}
        />

        {showCycleHealth ? (
          <CycleCalendarPanel cycle={cycleView} placement="footer" />
        ) : (
          <>
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

      {showCycleHealth && cycleSaveStatus !== 'idle' ? (
        <CycleSaveBanner status={cycleSaveStatus} />
      ) : null}
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
