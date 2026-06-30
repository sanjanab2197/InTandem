import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '@/constants/Theme';
import { resolveEventColor } from '@/constants/eventCategories';
import { useApp } from '@/context/AppContext';
import { CalendarEvent } from '@/types';

interface CalendarGridProps {
  events: CalendarEvent[];
  onDayPress: (date: string) => void;
  selectedDate?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT_SIZE = 8;
const DOT_GAP = 2;
const MAX_DOTS = 4;

export default function CalendarGrid({ events, onDayPress, selectedDate }: CalendarGridProps) {
  const { eventCategories } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getEventColor = (event: CalendarEvent) => resolveEventColor(event, eventCategories);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateStr] ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate === dateStr;

          return (
            <Pressable
              key={dateStr}
              style={[
                styles.dayCell,
                !inMonth && styles.dayCellOutside,
                today && styles.dayCellToday,
                selected && styles.dayCellSelected,
              ]}
              onPress={() => onDayPress(dateStr)}>
              <View style={styles.dayInner}>
                <Text
                  style={[
                    styles.dayNumber,
                    !inMonth && styles.dayNumberOutside,
                    today && styles.dayNumberToday,
                    selected && styles.dayNumberSelected,
                  ]}>
                  {format(day, 'd')}
                </Text>
                {dayEvents.length > 0 && (
                  <View style={styles.dotsRow}>
                    {dayEvents.slice(0, MAX_DOTS).map((ev) => (
                      <View
                        key={ev.id}
                        style={[
                          styles.dot,
                          { backgroundColor: getEventColor(ev) },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 22,
    color: Theme.primaryDark,
    fontWeight: '600',
    marginTop: -2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
    overflow: 'hidden',
  },
  dayInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayCellOutside: {
    opacity: 0.35,
  },
  dayCellToday: {
    backgroundColor: Theme.primaryLight,
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: Theme.primary,
    borderRadius: 12,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.text,
    lineHeight: 16,
  },
  dayNumberOutside: {
    color: Theme.textSecondary,
  },
  dayNumberToday: {
    fontWeight: '700',
    color: Theme.primaryDark,
  },
  dayNumberSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    width: DOT_SIZE * 2 + DOT_GAP,
    maxWidth: '100%',
    gap: DOT_GAP,
    marginTop: 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
