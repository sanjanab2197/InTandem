import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CalendarGrid from '@/components/CalendarGrid';
import EventCategoryManager from '@/components/EventCategoryManager';
import EventDetailModal from '@/components/EventDetailModal';
import ScreenHeader from '@/components/ScreenHeader';
import { Fonts } from '@/constants/Typography';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';

export default function CalendarScreen() {
  const {
    events,
    loading,
    eventCategories,
    getEventsForDate,
    addEvent,
    updateEvent,
    deleteEvent,
    addEventCategory,
    updateEventCategory,
    deleteEventCategory,
    addEventSubcategory,
    updateEventSubcategory,
    deleteEventSubcategory,
  } = useApp();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    setModalVisible(true);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Schedule"
          hint="Tap a date to view or edit plans"
          footer={
            <Pressable
              style={({ pressed }) => [styles.editCategories, pressed && styles.editCategoriesPressed]}
              onPress={() => setManageCategories(true)}>
              <View style={styles.editCategoriesBody}>
                <Text style={styles.editCategoriesTitle}>Edit categories</Text>
                <Text style={styles.editCategoriesDesc}>
                  Customize event types, labels, and colors on your calendar
                </Text>
              </View>
              <Text style={styles.editCategoriesArrow}>›</Text>
            </Pressable>
          }
        />

        <CalendarGrid
          events={events}
          onDayPress={handleDayPress}
          selectedDate={selectedDate ?? undefined}
        />

        <View style={styles.legend}>
          {eventCategories.map((cat) => (
            <View key={cat.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
              <Text style={styles.legendLabel}>{cat.label}</Text>
            </View>
          ))}
        </View>
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

      {selectedDate && (
        <EventDetailModal
          visible={modalVisible}
          date={selectedDate}
          events={getEventsForDate(selectedDate)}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
          onDelete={deleteEvent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.background },
  scroll: { padding: 20, paddingBottom: 40 },
  editCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  editCategoriesPressed: {
    backgroundColor: Theme.primaryLight,
    borderColor: 'rgba(139, 111, 212, 0.25)',
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
    marginTop: 20,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
});
