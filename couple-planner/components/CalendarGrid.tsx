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
const SPAN_LINE_HEIGHT = 2;
const SPAN_CAP_WIDTH = 2;
const MAX_SPAN_LANES = 4;

type SpanMetrics = {
  labelHeight: number;
  capHeight: number;
  laneGap: number;
  rowHeight: number;
  fontSize: number;
};

function getSpanMetrics(laneCount: number): SpanMetrics {
  if (laneCount <= 1) {
    return { labelHeight: 10, capHeight: 12, laneGap: 2, rowHeight: 22, fontSize: 8 };
  }
  if (laneCount === 2) {
    return { labelHeight: 9, capHeight: 10, laneGap: 1, rowHeight: 19, fontSize: 8 };
  }
  return { labelHeight: 7, capHeight: 8, laneGap: 1, rowHeight: 15, fontSize: 7 };
}

function weekSpanZoneHeight(laneCount: number, metrics: SpanMetrics): number {
  if (laneCount <= 0) return 0;
  return laneCount * metrics.rowHeight + Math.max(0, laneCount - 1) * metrics.laneGap;
}

const DOTS_ZONE_HEIGHT = DOT_SIZE + 4;
const COL_WIDTH = '14.285714%';

type WeekSpan = {
  startCol: number;
  endCol: number;
  showLabel: boolean;
  showLeftCap: boolean;
  showRightCap: boolean;
};

type EventWeekSpan = {
  event: CalendarEvent;
  span: WeekSpan;
  color: string;
};

function spansOverlap(a: WeekSpan, b: WeekSpan): boolean {
  return a.startCol <= b.endCol && b.startCol <= a.endCol;
}

function assignSpanLanes(items: EventWeekSpan[]): EventWeekSpan[][] {
  const sorted = [...items].sort((a, b) => {
    if (a.span.startCol !== b.span.startCol) return a.span.startCol - b.span.startCol;
    return a.span.endCol - b.span.endCol;
  });

  const lanes: EventWeekSpan[][] = [];
  for (const item of sorted) {
    let placed = false;
    for (const lane of lanes) {
      if (!lane.some((existing) => spansOverlap(existing.span, item.span))) {
        lane.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([item]);
  }
  return lanes;
}

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

  const getDotColor = (event: CalendarEvent) => resolveEventColor(event, eventCategories);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const weekRows = useMemo(() => {
    const rows: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [days]);

  const weekSpanLanes = useMemo(() => {
    return weekRows.map((week) => {
      const items: EventWeekSpan[] = [];
      events.forEach((event) => {
        if (!isMultiDayEvent(event)) return;
        const span = getWeekSpan(event, week);
        if (!span) return;
        items.push({ event, span, color: resolveEventColor(event, eventCategories) });
      });
      return assignSpanLanes(items);
    });
  }, [weekRows, events, eventCategories]);

  const singleDayEventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (isMultiDayEvent(e)) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const renderBarSegment = (item: EventWeekSpan, metrics: SpanMetrics) => {
    const { span, color } = item;
    const colCount = span.endCol - span.startCol + 1;
    const lineTop = (metrics.capHeight - SPAN_LINE_HEIGHT) / 2;

    return (
      <View
        key={item.event.id}
        style={[
          styles.weekSpanSegment,
          {
            left: `${(span.startCol / 7) * 100}%`,
            width: `${(colCount / 7) * 100}%`,
            height: metrics.rowHeight,
          },
        ]}>
        <View style={[styles.spanLineTrack, { height: metrics.capHeight }]}>
          <View
            style={[
              styles.spanLineBar,
              { backgroundColor: color, top: lineTop, height: SPAN_LINE_HEIGHT },
            ]}
          />
        </View>
        {span.showLeftCap ? (
          <View
            style={[
              styles.spanVertical,
              styles.spanVerticalLeft,
              { backgroundColor: color, height: metrics.capHeight },
            ]}
          />
        ) : null}
        {span.showRightCap ? (
          <View
            style={[
              styles.spanVertical,
              styles.spanVerticalRight,
              { backgroundColor: color, height: metrics.capHeight },
            ]}
          />
        ) : null}
      </View>
    );
  };

  const renderLaneLabels = (lane: EventWeekSpan[], metrics: SpanMetrics) => {
    const labelsByCol = new Map<
      number,
      { titles: string[]; color: string; hasLeftCap: boolean; endCol: number }
    >();

    lane.forEach(({ event, span, color }) => {
      if (!span.showLabel) return;
      const existing = labelsByCol.get(span.startCol);
      if (existing) {
        existing.titles.push(event.title);
        existing.endCol = Math.max(existing.endCol, span.endCol);
      } else {
        labelsByCol.set(span.startCol, {
          titles: [event.title],
          color,
          hasLeftCap: span.showLeftCap,
          endCol: span.endCol,
        });
      }
    });

    return Array.from(labelsByCol.entries()).map(([startCol, { titles, color, hasLeftCap, endCol }]) => {
      const colSpan = Math.max(1, Math.min(endCol - startCol + 1, 3));
      return (
        <View
          key={`label-${startCol}-${titles.join(',')}`}
          style={[
            styles.weekSpanLabelSlot,
            {
              left: `${(startCol / 7) * 100}%`,
              width: `${(colSpan / 7) * 100}%`,
              height: metrics.labelHeight,
              paddingLeft: hasLeftCap ? SPAN_CAP_WIDTH + 2 : 1,
            },
          ]}>
          <Text
            style={[styles.spanLabelAbove, { color, fontSize: metrics.fontSize, lineHeight: metrics.labelHeight }]}
            numberOfLines={1}>
            {titles.join(', ')}
          </Text>
        </View>
      );
    });
  };

  const renderLane = (lane: EventWeekSpan[], metrics: SpanMetrics) => (
    <>
      {renderLaneLabels(lane, metrics)}
      {lane.map((item) => renderBarSegment(item, metrics))}
    </>
  );

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
        {weekRows.map((week, weekIndex) => {
          const allLanes = weekSpanLanes[weekIndex] ?? [];
          const hiddenLaneCount = Math.max(0, allLanes.length - MAX_SPAN_LANES);
          const lanes = allLanes.slice(0, MAX_SPAN_LANES);
          const metrics = getSpanMetrics(lanes.length);
          const spanZoneHeight = weekSpanZoneHeight(lanes.length, metrics);
          const overflowHeight = hiddenLaneCount > 0 ? 10 : 0;
          const weekEventsZoneHeight = DOTS_ZONE_HEIGHT + spanZoneHeight + overflowHeight + 4;
          const weekCellMinHeight = 48 + weekEventsZoneHeight;

          return (
          <View key={`week-${weekIndex}`} style={[styles.weekWrap, { minHeight: weekCellMinHeight }]}>
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
                    <View style={[styles.dayInner, { minHeight: weekCellMinHeight - 4 }]}>
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

                      <View style={[styles.eventsBottom, { height: weekEventsZoneHeight }]}>
                        {lanes.length > 0 ? (
                          <View style={{ height: spanZoneHeight + overflowHeight }} />
                        ) : null}
                        <View style={styles.dotsZone}>
                          {hasDots ? (
                            <View style={styles.dotsRow}>
                              {singleDayEvents.slice(0, MAX_DOTS).map((ev) => (
                                <View
                                  key={ev.id}
                                  style={[styles.dot, { backgroundColor: getDotColor(ev) }]}
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

            {lanes.length > 0 ? (
              <View
                style={[styles.weekSpanLayer, { height: weekEventsZoneHeight }]}
                pointerEvents="none">
                {hiddenLaneCount > 0 ? (
                  <Text
                    style={[
                      styles.spanOverflowHint,
                      { bottom: DOTS_ZONE_HEIGHT + spanZoneHeight + 1 },
                    ]}>
                    +{hiddenLaneCount} more
                  </Text>
                ) : null}
                {lanes.map((lane, laneIndex) => (
                    <View
                      key={`lane-${laneIndex}`}
                      style={[
                        styles.weekSpanLane,
                        {
                          height: metrics.rowHeight,
                          bottom:
                            DOTS_ZONE_HEIGHT +
                            overflowHeight +
                            laneIndex * (metrics.rowHeight + metrics.laneGap),
                        },
                      ]}>
                      {renderLane(lane, metrics)}
                    </View>
                  ))}
              </View>
            ) : null}
          </View>
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
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  weekSpanSegment: {
    position: 'absolute',
    bottom: 0,
    zIndex: 1,
  },
  weekSpanLabelSlot: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    justifyContent: 'center',
    overflow: 'hidden',
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
  spanLabelAbove: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  spanLineTrack: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  spanLineBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  spanVertical: {
    width: SPAN_CAP_WIDTH,
    borderRadius: 1,
    position: 'absolute',
    bottom: 0,
    zIndex: 3,
  },
  spanOverflowHint: {
    position: 'absolute',
    right: 4,
    fontSize: 7,
    fontWeight: '600',
    color: Theme.textSecondary,
    lineHeight: 9,
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
