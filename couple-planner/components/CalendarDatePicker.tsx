import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '@/constants/Theme';

interface CalendarDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  onSelect?: (date: Date) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarDatePicker({
  value,
  onChange,
  minimumDate,
  onSelect,
}: CalendarDatePickerProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));
  const minDay = minimumDate ? startOfDay(minimumDate) : null;

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const selectDay = (day: Date) => {
    if (minDay && isBefore(startOfDay(day), minDay)) return;
    const next = new Date(value);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(next);
    onSelect?.(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable style={styles.navBtn} onPress={() => setViewMonth(subMonths(viewMonth, 1))}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{format(viewMonth, 'MMM yyyy')}</Text>
        <Pressable style={styles.navBtn} onPress={() => setViewMonth(addMonths(viewMonth, 1))}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const selected = isSameDay(day, value);
          const disabled = minDay ? isBefore(startOfDay(day), minDay) : false;
          const today = isSameDay(day, new Date());

          return (
            <Pressable
              key={day.toISOString()}
              style={[
                styles.dayCell,
                selected && styles.dayCellSelected,
                today && !selected && styles.dayCellToday,
                disabled && styles.dayCellDisabled,
              ]}
              disabled={disabled}
              onPress={() => selectDay(day)}>
              <Text
                style={[
                  styles.dayText,
                  !inMonth && styles.dayTextOutside,
                  selected && styles.dayTextSelected,
                  disabled && styles.dayTextDisabled,
                  today && !selected && styles.dayTextToday,
                ]}>
                {format(day, 'd')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 18, color: Theme.primaryDark, fontWeight: '600', marginTop: -1 },
  monthTitle: { fontSize: 14, fontWeight: '700', color: Theme.text },
  weekdayRow: { flexDirection: 'row', marginBottom: 2 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: Theme.textSecondary,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Theme.primary,
    borderRadius: 16,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 16,
  },
  dayCellDisabled: { opacity: 0.25 },
  dayText: { fontSize: 13, fontWeight: '500', color: Theme.text },
  dayTextOutside: { color: Theme.textSecondary, opacity: 0.45 },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextDisabled: { color: Theme.textSecondary },
  dayTextToday: { color: Theme.primaryDark, fontWeight: '700' },
});
