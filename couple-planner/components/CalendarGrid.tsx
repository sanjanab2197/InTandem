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
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';

import { Theme } from '@/constants/Theme';
import { resolveEventColor } from '@/constants/eventCategories';
import { useApp } from '@/context/AppContext';
import { CalendarEvent } from '@/types';
import {
  eventIncludesDate,
  getEventEndDate,
  isMultiDayEvent,
} from '@/utils/calendarEvents';

interface CalendarGridProps {
  events: CalendarEvent[];
  onDayPress: (date: string) => void;
  onDayLongPress?: (date: string) => void;
  selectedDate?: string;
  crossedOffDates?: string[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT_SIZE = 7;
const DOT_GAP = 2;
const MAX_DOTS = 3;
const MAX_SPAN_BARS = 2;
const SPAN_LINE_HEIGHT = 2;
const SPAN_CAP_WIDTH = 2;
const SPAN_CAP_HEIGHT = 8;
const DOTS_ZONE_HEIGHT = DOT_SIZE + 4;
const SPAN_LANE_GAP = 2;
const SPAN_ROW_HEIGHT = 10 + SPAN_CAP_HEIGHT;
const COL_WIDTH = '14.285714%';

type WeekSpan = {
  startCol: number;
  endCol: number;
  showLabel: boolean;
  showLeftCap: boolean;
  showRightCap: boolean;
};

function getWeekSpan(event: CalendarEvent, week: Date[]): WeekSpan | null {
  let startCol = -1;
  let endCol = -1;
  week.forEach((day, col) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (eventIncludesDate(event, dateStr)) {
      if (startCol === -1) startCol = col;
      endCol = col;
    }
  });
  if (startCol === -1) return null;

  const startDateStr = format(week[startCol], 'yyyy-MM-dd');
  const endDateStr = format(week[endCol], 'yyyy-MM-dd');
  const eventEnd = getEventEndDate(event);

  return {
    startCol,
    endCol,
    showLabel: startDateStr === event.date,
    showLeftCap: startDateStr === event.date,
    showRightCap: endDateStr === eventEnd,
  };
}

export default function CalendarGrid({
  events,
  onDayPress,
  onDayLongPress,
  selectedDate,
  crossedOffDates = [],
}: CalendarGridProps) {
  const { eventCategories } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const crossedOffSet = useMemo(() => new Set(crossedOffDates), [crossedOffDates]);

  const getEventColor = (event: CalendarEvent) => resolveEventColor(event, eventCategories);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const spanLanes = useMemo(
    () => events.filter(isMultiDayEvent).slice(0, MAX_SPAN_BARS),
    [events]
  );

  const weekRows = useMemo(() => {
    const rows: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [days]);

  const singleDayEventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (isMultiDayEvent(e)) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const spanZoneHeight = spanLanes.length * SPAN_ROW_HEIGHT + Math.max(0, spanLanes.length - 1) * SPAN_LANE_GAP;
  const eventsZoneHeight = DOTS_ZONE_HEIGHT + spanZoneHeight + 4;
  const cellMinHeight = 48 + eventsZoneHeight;

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
        {weekRows.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={[styles.weekWrap, { minHeight: cellMinHeight }]}>
            <View style={styles.weekRow}>
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const singleDayEvents = singleDayEventsByDate[dateStr] ?? [];
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const selected = selectedDate === dateStr;
                const crossedOff = crossedOffSet.has(dateStr);
                const hasDots = singleDayEvents.length > 0;

                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.dayCell,
                      !inMonth && styles.dayCellOutside,
                      today && styles.dayCellToday,
                      selected && styles.dayCellSelected,
                    ]}
                    onPress={() => onDayPress(dateStr)}
                    onLongPress={() => onDayLongPress?.(dateStr)}
                    delayLongPress={400}>
                    <View style={[styles.dayInner, { minHeight: cellMinHeight - 4 }]}>
                      <View style={styles.dayNumberCenter} pointerEvents="none">
                        <Text
                          style={[
                            styles.dayNumber,
                            !inMonth && styles.dayNumberOutside,
                            today && styles.dayNumberToday,
                            selected && styles.dayNumberSelected,
                          ]}>
                          {format(day, 'd')}
                        </Text>
                      </View>

                      <View style={[styles.eventsBottom, { height: eventsZoneHeight }]}>
                        {spanLanes.length > 0 ? (
                          <View style={{ height: spanZoneHeight }} />
                        ) : null}
                        <View style={styles.dotsZone}>
                          {hasDots ? (
                            <View style={styles.dotsRow}>
                              {singleDayEvents.slice(0, MAX_DOTS).map((ev) => (
                                <View
                                  key={ev.id}
                                  style={[styles.dot, { backgroundColor: getEventColor(ev) }]}
                                />
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {crossedOff ? (
                        <View style={styles.crossOffOverlay} pointerEvents="none">
                          <View style={styles.crossOffLine} />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {spanLanes.length > 0 ? (
              <View
                style={[styles.weekSpanLayer, { height: eventsZoneHeight }]}
                pointerEvents="none">
                {spanLanes.map((event, laneIndex) => {
                  const span = getWeekSpan(event, week);
                  if (!span) return null;
                  const color = getEventColor(event);
                  const colCount = span.endCol - span.startCol + 1;
                  const laneBottom =
                    DOTS_ZONE_HEIGHT + laneIndex * (SPAN_ROW_HEIGHT + SPAN_LANE_GAP);

                  return (
                    <View
                      key={event.id}
                      style={[
                        styles.weekSpanLane,
                        {
                          left: `${(span.startCol / 7) * 100}%`,
                          width: `${(colCount / 7) * 100}%`,
                          bottom: laneBottom,
                        },
                      ]}>
                      {span.showLabel ? (
                        <Text style={[styles.spanLabel, { color }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                      ) : (
                        <View style={styles.spanLabelSpacer} />
                      )}
                      <View style={styles.spanLineTrack}>
                        <View style={[styles.spanLineBar, { backgroundColor: color }]} />
                        {span.showLeftCap ? (
                          <View
                            style={[
                              styles.spanVertical,
                              styles.spanVerticalLeft,
                              { backgroundColor: color },
                            ]}
                          />
                        ) : null}
                        {span.showRightCap ? (
                          <View
                            style={[
                              styles.spanVertical,
                              styles.spanVerticalRight,
                              { backgroundColor: color },
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
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
    flexWrap: 'nowrap',
    marginBottom: 8,
  },
  weekday: {
    width: COL_WIDTH,
    flexShrink: 0,
    flexGrow: 0,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  grid: {
    overflow: 'hidden',
  },
  weekWrap: {
    position: 'relative',
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    width: '100%',
  },
  weekSpanLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9,
  },
  weekSpanLane: {
    position: 'absolute',
    height: SPAN_ROW_HEIGHT,
    justifyContent: 'flex-end',
  },
  dayCell: {
    width: COL_WIDTH,
    flexShrink: 0,
    flexGrow: 0,
    paddingVertical: 2,
  },
  dayInner: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  dayCellOutside: {
    opacity: 0.35,
  },
  dayCellToday: {
    backgroundColor: 'rgba(139, 111, 212, 0.1)',
    borderRadius: 12,
  },
  dayCellSelected: {
    borderRadius: 12,
    backgroundColor: 'rgba(42, 36, 56, 0.05)',
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 1.5,
          outlineColor: 'rgba(42, 36, 56, 0.22)',
          outlineStyle: 'solid',
        } as object)
      : {
          borderWidth: 1.5,
          borderColor: 'rgba(42, 36, 56, 0.22)',
        }),
  },
  dayNumberCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.text,
    lineHeight: 16,
    textAlign: 'center',
  },
  dayNumberOutside: {
    color: Theme.textSecondary,
  },
  dayNumberToday: {
    fontWeight: '700',
    color: Theme.text,
  },
  dayNumberSelected: {
    fontWeight: '700',
    color: Theme.text,
  },
  eventsBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  spanLabel: {
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
    height: 10,
    paddingHorizontal: 4,
    letterSpacing: -0.2,
  },
  spanLabelSpacer: {
    height: 10,
  },
  spanLineTrack: {
    height: SPAN_CAP_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  spanLineBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (SPAN_CAP_HEIGHT - SPAN_LINE_HEIGHT) / 2,
    height: SPAN_LINE_HEIGHT,
  },
  spanVertical: {
    width: SPAN_CAP_WIDTH,
    height: SPAN_CAP_HEIGHT,
    borderRadius: 1,
    position: 'absolute',
    top: 0,
  },
  spanVerticalLeft: {
    left: 0,
  },
  spanVerticalRight: {
    right: 0,
  },
  dotsZone: {
    height: DOTS_ZONE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    width: DOT_SIZE * 2 + DOT_GAP,
    maxWidth: '100%',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  crossOffOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 12,
    zIndex: 20,
  },
  crossOffLine: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '160%',
    height: 2,
    marginLeft: '-80%',
    marginTop: -1,
    backgroundColor: '#E53935',
    transform: [{ rotate: '-45deg' }],
  },
});
