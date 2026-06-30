import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CalendarGrid from '@/components/CalendarGrid';
import EventCategoryManager from '@/components/EventCategoryManager';
import EventDetailModal from '@/components/EventDetailModal';
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
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.title}>
              Our <Text style={styles.titleHighlight}>Schedule</Text>
            </Text>
            <View style={styles.titleAccent}>
              <View style={[styles.accentMark, { backgroundColor: Theme.primary }]} />
              <View style={[styles.accentMark, { backgroundColor: Theme.love.rose }]} />
              <View style={[styles.accentMark, { backgroundColor: Theme.secondary }]} />
            </View>
            <Text style={styles.subtitle}>Tap a date to view or edit plans</Text>
          </View>

          <Pressable style={styles.editLink} onPress={() => setManageCategories(true)}>
            <Text style={styles.editLinkText}>Edit categories</Text>
          </Pressable>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerMain: { flex: 1, paddingRight: 12 },
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
  editLink: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Theme.primaryLight,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.primaryDark,
    fontFamily: 'Inter_600SemiBold',
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
