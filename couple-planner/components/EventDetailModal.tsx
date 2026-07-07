import { addDays, format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DayTimelineView from '@/components/DayTimelineView';
import DrillDownScreenHeader, { drillDownHeaderStyles } from '@/components/DrillDownScreenHeader';
import EventSchedulerSheet from '@/components/EventSchedulerSheet';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { CalendarEvent, DayViewFilters } from '@/types';
import {
  defaultDayViewFilters,
  defaultParticipantFromFilters,
  partnerTabLabel,
} from '@/utils/participant';

interface EventDetailModalProps {
  visible: boolean;
  date: string;
  onClose: () => void;
  onDateChange: (date: string) => void;
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

function filterToParticipant(filters: DayViewFilters, mySlot?: 1 | 2 | null) {
  return defaultParticipantFromFilters(filters, mySlot);
}

export default function EventDetailModal({
  visible,
  date,
  onClose,
  onDateChange,
  onSave,
  onDelete,
}: EventDetailModalProps) {
  const { profile, eventCategories, getEventsForDate } = useApp();
  const { couple } = useCouple();
  const insets = useSafeAreaInsets();
  const [dayFilter, setDayFilter] = useState<DayViewFilters>(() => defaultDayViewFilters());
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [slotMinutes, setSlotMinutes] = useState(9 * 60);
  const [allDayCreate, setAllDayCreate] = useState(false);

  const p1Name = partnerTabLabel(couple?.partner1Name ?? profile.partner1Name);
  const p2Name = partnerTabLabel(couple?.partner2Name ?? profile.partner2Name);
  const dayEvents = getEventsForDate(date);

  useEffect(() => {
    if (!visible) {
      setSchedulerOpen(false);
      setEditing(null);
    } else {
      setDayFilter(defaultDayViewFilters(couple?.mySlot ?? null));
    }
  }, [visible, couple?.mySlot]);

  const openSlot = (startMinutes: number) => {
    setEditing(null);
    setSlotMinutes(startMinutes);
    setAllDayCreate(false);
    setSchedulerOpen(true);
  };

  const openAllDay = () => {
    setEditing(null);
    setAllDayCreate(true);
    setSchedulerOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setSlotMinutes(9 * 60);
    setAllDayCreate(false);
    setSchedulerOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setAllDayCreate(false);
    setSchedulerOpen(true);
  };

  const closeScheduler = () => {
    setSchedulerOpen(false);
    setEditing(null);
  };

  const goPrevDay = () => onDateChange(format(addDays(parseISO(date), -1), 'yyyy-MM-dd'));
  const goNextDay = () => onDateChange(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'));

  const parsed = parseISO(date);
  const dayNum = format(parsed, 'd');

  if (!visible) return null;

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.containerWeb]}>
      {schedulerOpen ? (
        <EventSchedulerSheet
          key={editing?.id ?? `new-${slotMinutes}-${allDayCreate}`}
          visible
          date={date}
          editing={editing}
          initialStartMinutes={slotMinutes}
          initialAllDay={allDayCreate}
          defaultParticipant={filterToParticipant(dayFilter, couple?.mySlot ?? null)}
          eventCategories={eventCategories}
          partner1Label={p1Name}
          partner2Label={p2Name}
          onClose={closeScheduler}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : (
        <>
          <DrillDownScreenHeader insetTop={insets.top} onBack={onClose} contentAlign="right">
            <View style={[drillDownHeaderStyles.navRow, drillDownHeaderStyles.navRowRight]}>
              <Pressable onPress={goPrevDay} style={drillDownHeaderStyles.navBtn} hitSlop={8}>
                <Text style={drillDownHeaderStyles.navChevron}>‹</Text>
              </Pressable>
              <Text style={drillDownHeaderStyles.dayNumber}>{dayNum}</Text>
              <Pressable onPress={goNextDay} style={drillDownHeaderStyles.navBtn} hitSlop={8}>
                <Text style={drillDownHeaderStyles.navChevron}>›</Text>
              </Pressable>
            </View>
          </DrillDownScreenHeader>

          <View style={styles.timelineWrap}>
            <DayTimelineView
              date={date}
              events={dayEvents}
              eventCategories={eventCategories}
              filter={dayFilter}
              onFilterChange={setDayFilter}
              partner1Label={p1Name}
              partner2Label={p2Name}
              onEventPress={openEdit}
              onSlotPress={openSlot}
              onAllDayPress={openAllDay}
            />
          </View>

          <Pressable style={styles.fab} onPress={openCreate}>
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: Theme.surface, overflow: 'hidden' },
  containerWeb: { height: '100%' },
  timelineWrap: { flex: 1, minHeight: 0 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 32, fontWeight: '300', color: '#fff', marginTop: -2 },
});
