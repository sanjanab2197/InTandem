import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolveEventSurfaceColor } from '@/constants/eventCategories';
import { Theme } from '@/constants/Theme';
import { CalendarEvent, EventCategoryConfig, DayViewFilterKey, DayViewFilters } from '@/types';
import { formatEventDateRange, isMultiDayEvent } from '@/utils/calendarEvents';
import {
  formatMinutesCompact,
  formatTimelineHour,
  getNowMinutes,
  getTimelineScrollOffset,
  isTodayDate,
  layoutTimedEvents,
  minutesFromTimelineY,
  splitTimelineEvents,
  TIMELINE_HOUR_HEIGHT,
  TIMELINE_HOURS,
  TIMELINE_TOTAL_HEIGHT,
} from '@/utils/dayTimeline';
import { filterEventsByDayView, getParticipantTheme, normalizeParticipant, PARTICIPANT_THEME, toggleDayViewFilter } from '@/utils/participant';

const GUTTER_WIDTH = 52;
const PARTICIPANT_STRIPE_WIDTH = 5;
const SLOT_LONG_PRESS_MS = 280;

function participantStripeColor(event: CalendarEvent): string {
  return getParticipantTheme(normalizeParticipant(event.participant)).color;
}

function EventParticipantStripe({ event }: { event: CalendarEvent }) {
  return (
    <View
      style={[styles.participantStripe, { backgroundColor: participantStripeColor(event) }]}
    />
  );
}

interface DayTimelineViewProps {
  date: string;
  events: CalendarEvent[];
  eventCategories: EventCategoryConfig[];
  filter: DayViewFilters;
  onFilterChange: (filter: DayViewFilters) => void;
  partner1Label: string;
  partner2Label: string;
  onEventPress: (event: CalendarEvent) => void;
  onSlotPress: (startMinutes: number) => void;
  onAllDayPress: () => void;
}

export default function DayTimelineView({
  date,
  events,
  eventCategories,
  filter,
  onFilterChange,
  partner1Label,
  partner2Label,
  onEventPress,
  onSlotPress,
  onAllDayPress,
}: DayTimelineViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes());
  const isToday = isTodayDate(date);

  const filteredEvents = useMemo(
    () => filterEventsByDayView(events, filter),
    [events, filter]
  );

  const { allDay, timed } = useMemo(() => splitTimelineEvents(filteredEvents), [filteredEvents]);
  const layouts = useMemo(() => layoutTimedEvents(timed), [timed]);

  useEffect(() => {
    const offset = getTimelineScrollOffset(date, timed);
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [date, filter.partner1, filter.partner2, filter.together, timed.length]);

  useEffect(() => {
    if (!isToday) return;
    const tick = setInterval(() => setNowMinutes(getNowMinutes()), 60_000);
    return () => clearInterval(tick);
  }, [isToday]);

  const nowTop = (nowMinutes / 60) * TIMELINE_HOUR_HEIGHT;

  const filterOptions: { key: DayViewFilterKey; label: string }[] = [
    { key: 'partner1', label: partner1Label },
    { key: 'partner2', label: partner2Label },
    { key: 'together', label: 'Together' },
  ];

  const noneSelected = !filter.partner1 && !filter.partner2 && !filter.together;

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <View style={styles.filterRow}>
          {filterOptions.map(({ key, label }) => {
            const checked = filter[key];
            const theme = getParticipantTheme(key);
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.filterItem, pressed && styles.filterItemPressed]}
                onPress={() => onFilterChange(toggleDayViewFilter(filter, key))}>
                <View
                  style={[
                    styles.filterDot,
                    { borderColor: theme.color },
                    checked && { backgroundColor: theme.color },
                  ]}>
                  {checked ? <Text style={styles.filterCheck}>✓</Text> : null}
                </View>
                <Text
                  style={[
                    styles.filterLabel,
                    checked && styles.filterLabelOn,
                    { color: checked ? theme.colorDark : Theme.textSecondary },
                  ]}
                  numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {noneSelected ? (
          <Text style={styles.filterHint}>Nothing selected — events hidden</Text>
        ) : (
          <Text style={styles.filterLegend}>Color bar = who · fill = category</Text>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, Platform.OS === 'web' && styles.scrollWeb]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
        {...(Platform.OS === 'web' ? { dataSet: { timelineScroll: 'true' } } : {})}>
        <View style={styles.allDayRow}>
          <Text style={styles.gutterLabel}>All-day</Text>
          <Pressable style={styles.allDayContent} onPress={onAllDayPress}>
            {allDay.length === 0 ? (
              <View style={styles.allDayEmpty} />
            ) : (
              allDay.map((event) => {
                const surfaceColor = resolveEventSurfaceColor(event, eventCategories);
                return (
                  <Pressable
                    key={event.id}
                    style={styles.allDayEvent}
                    onPress={() => onEventPress(event)}>
                    <EventParticipantStripe event={event} />
                    <View style={styles.stripeGap} />
                    <View style={[styles.allDayEventBody, { backgroundColor: surfaceColor }]}>
                      <Text style={styles.allDayEventText} numberOfLines={1}>
                        {event.title}
                        {isMultiDayEvent(event) ? ` · ${formatEventDateRange(event)}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.timelineRow}>
          <View style={[styles.timeGutter, { height: TIMELINE_TOTAL_HEIGHT }]}>
            {Array.from({ length: TIMELINE_HOURS }, (_, hour) => (
              <View key={hour} style={[styles.timeLabelWrap, { height: TIMELINE_HOUR_HEIGHT }]}>
                <Text style={styles.timeLabel}>{formatTimelineHour(hour)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.gridColumn, { height: TIMELINE_TOTAL_HEIGHT }]}>
            {Array.from({ length: TIMELINE_HOURS }, (_, hour) => (
              <View
                key={`hour-${hour}`}
                style={[styles.hourLine, { top: hour * TIMELINE_HOUR_HEIGHT }]}
                pointerEvents="none"
              />
            ))}
            {Array.from({ length: TIMELINE_HOURS }, (_, hour) => (
              <View
                key={`half-${hour}`}
                style={[
                  styles.halfHourLine,
                  { top: hour * TIMELINE_HOUR_HEIGHT + TIMELINE_HOUR_HEIGHT / 2 },
                ]}
                pointerEvents="none"
              />
            ))}

            <Pressable
              style={[styles.slotOverlay, { height: TIMELINE_TOTAL_HEIGHT }]}
              delayLongPress={SLOT_LONG_PRESS_MS}
              onLongPress={(event) => {
                const y = event.nativeEvent.locationY ?? 0;
                onSlotPress(minutesFromTimelineY(y));
              }}
            />

            {isToday ? (
              <View style={[styles.nowRow, { top: nowTop - 10 }]} pointerEvents="none">
                <View style={styles.nowTimeBadge}>
                  <Text style={styles.nowTimeText}>{formatMinutesCompact(nowMinutes)}</Text>
                </View>
                <View style={styles.nowMarker}>
                  <View style={[styles.nowPartnerDot, styles.nowPartnerDotBack]} />
                  <View style={[styles.nowPartnerDot, styles.nowPartnerDotFront]} />
                </View>
                <View style={styles.nowLineWrap}>
                  <View style={styles.nowLineSolid} />
                  <View style={styles.nowLineFade} />
                </View>
              </View>
            ) : null}

            {layouts.map(({ event, top, height, column, columnCount, startMinutes, endMinutes }) => {
              const surfaceColor = resolveEventSurfaceColor(event, eventCategories);
              const gap = 2;
              const widthPct = 100 / columnCount;
              const leftPct = column * widthPct;
              const showTime = height >= 28;
              return (
                <Pressable
                  key={event.id}
                  style={[
                    styles.eventBlock,
                    {
                      top,
                      height,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      paddingLeft: column === 0 ? 2 : gap,
                      paddingRight: gap,
                    },
                  ]}
                  onPress={() => onEventPress(event)}>
                  <EventParticipantStripe event={event} />
                  <View style={styles.stripeGap} />
                  <View style={[styles.eventBlockBody, { backgroundColor: surfaceColor }]}>
                    <Text
                      style={styles.eventTitle}
                      numberOfLines={height >= 52 ? 2 : 1}>
                      {event.title}
                    </Text>
                    {showTime && height >= 40 ? (
                      <Text style={styles.eventTime} numberOfLines={1}>
                        {formatMinutesCompact(startMinutes)}
                        {endMinutes > startMinutes ? ` – ${formatMinutesCompact(endMinutes)}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: Theme.surface, overflow: 'hidden' },
  filterBar: {
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  filterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  filterItemPressed: { opacity: 0.55 },
  filterDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C4C0CC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterCheck: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: Theme.textSecondary,
    flexShrink: 1,
  },
  filterLabelOn: {
    fontWeight: '500',
    color: Theme.text,
  },
  filterHint: {
    fontSize: 12,
    color: Theme.textSecondary,
    textAlign: 'center',
    paddingTop: 6,
    opacity: 0.85,
  },
  filterLegend: {
    fontSize: 11,
    color: Theme.textSecondary,
    textAlign: 'center',
    paddingTop: 6,
    letterSpacing: 0.15,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollWeb: {
    scrollbarWidth: 'none',
    // @ts-expect-error legacy Edge
    msOverflowStyle: 'none',
  },
  scrollContent: { paddingBottom: 88 },
  allDayRow: {
    flexDirection: 'row',
    minHeight: 28,
    paddingVertical: 6,
    paddingRight: 8,
  },
  gutterLabel: {
    width: GUTTER_WIDTH,
    fontSize: 10,
    fontWeight: '500',
    color: Theme.textSecondary,
    textAlign: 'right',
    paddingRight: 8,
    paddingTop: 4,
  },
  allDayContent: {
    flex: 1,
    gap: 4,
    minHeight: 24,
    justifyContent: 'center',
  },
  allDayEmpty: { height: 4 },
  allDayEvent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 26,
  },
  stripeGap: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: Theme.surface,
    flexShrink: 0,
  },
  allDayEventBody: {
    flex: 1,
    minWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  allDayEventText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.border,
    marginLeft: GUTTER_WIDTH,
  },
  timelineRow: { flexDirection: 'row' },
  timeGutter: { width: GUTTER_WIDTH },
  timeLabelWrap: { justifyContent: 'flex-start' },
  timeLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: Theme.textSecondary,
    marginTop: -6,
    textAlign: 'right',
    paddingRight: 8,
  },
  gridColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Theme.border,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.border,
  },
  halfHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.border,
    opacity: 0.45,
  },
  slotOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  nowRow: {
    position: 'absolute',
    left: -GUTTER_WIDTH + 4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
    height: 20,
  },
  nowTimeBadge: {
    width: GUTTER_WIDTH - 8,
    backgroundColor: Theme.primary,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginRight: 2,
  },
  nowTimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  nowMarker: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  nowPartnerDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Theme.surface,
  },
  nowPartnerDotBack: {
    backgroundColor: PARTICIPANT_THEME.partner2.color,
    left: 0,
    top: 4,
  },
  nowPartnerDotFront: {
    backgroundColor: PARTICIPANT_THEME.partner1.color,
    right: 0,
    top: 1,
  },
  nowLineWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 3,
  },
  nowLineSolid: {
    flex: 0.55,
    height: 3,
    backgroundColor: Theme.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  nowLineFade: {
    flex: 0.45,
    height: 3,
    backgroundColor: Theme.primary,
    opacity: 0.22,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  eventBlock: {
    position: 'absolute',
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 2,
  },
  participantStripe: {
    width: PARTICIPANT_STRIPE_WIDTH,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  eventBlockBody: {
    flex: 1,
    minWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
    color: Theme.text,
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
    color: Theme.textSecondary,
  },
});
