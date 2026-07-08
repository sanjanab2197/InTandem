import { addDays, format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DrillDownScreenHeader, { drillDownHeaderStyles } from '@/components/DrillDownScreenHeader';
import { CYCLE_THEME } from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { CycleOwner, FlowLevel } from '@/types';
import { logsForDate } from '@/utils/cycleTracking';

const WINDOW_DAYS = 10;

interface CyclePeriodEditSheetProps {
  date: string;
  owner: CycleOwner;
  readOnly?: boolean;
  onClose: () => void;
}

export default function CyclePeriodEditSheet({
  date,
  owner,
  readOnly = false,
  onClose,
}: CyclePeriodEditSheetProps) {
  const insets = useSafeAreaInsets();
  const { cycleData, getCycleProfile, setCycleLog, markPeriodStart } = useApp();
  const profile = useMemo(() => getCycleProfile(owner), [getCycleProfile, owner, cycleData]);
  const anchor = parseISO(date);
  const title = format(anchor, 'EEEE, MMM d');

  const windowDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = -WINDOW_DAYS; i <= WINDOW_DAYS; i += 1) {
      dates.push(format(addDays(anchor, i), 'yyyy-MM-dd'));
    }
    return dates;
  }, [date]);

  const dayLogs = logsForDate(profile, date);
  const periodLog = dayLogs.find((l) => l.kind === 'period');
  const currentFlow = (periodLog?.value ?? 'none') as FlowLevel;

  const isPeriodDay = (d: string) =>
    logsForDate(profile, d).some((l) => l.kind === 'period' && l.value && l.value !== 'none');

  const togglePeriodDay = (d: string) => {
    if (readOnly) return;
    if (isPeriodDay(d)) {
      setCycleLog(owner, d, 'period', 'none');
    } else {
      setCycleLog(owner, d, 'period', 'yes');
    }
  };

  const setFlow = (value: FlowLevel) => {
    if (readOnly) return;
    if (value === 'none') {
      setCycleLog(owner, date, 'period', 'none');
    } else {
      setCycleLog(owner, date, 'period', 'yes');
    }
  };

  return (
    <View style={styles.container}>
      <DrillDownScreenHeader insetTop={insets.top} onBack={onClose} backSymbol="✕">
        <Text style={drillDownHeaderStyles.eventTitle}>Edit period</Text>
      </DrillDownScreenHeader>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>{title}</Text>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>How it works</Text>
          <Text style={styles.helpText}>
            Tap dates below to add or remove period days — every cycle is different (3 days, 7 days,
            or more). Mark each day you bleed, just like Flo.
          </Text>
          <Text style={styles.helpText}>
            Long-press any day on the calendar to open this editor again.
          </Text>
        </View>

        {!readOnly ? (
          <>
            <Text style={styles.sectionLabel}>Period days</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}>
              {windowDates.map((d) => {
                const active = isPeriodDay(d);
                const isAnchor = d === date;
                const parsed = parseISO(d);
                return (
                  <Pressable
                    key={d}
                    style={[styles.stripDay, isAnchor && styles.stripDayAnchor]}
                    onPress={() => togglePeriodDay(d)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}>
                    <Text style={styles.stripWeekday}>{format(parsed, 'EEE')}</Text>
                    <View style={[styles.stripCircle, active && styles.stripCircleOn]}>
                      <Text style={[styles.stripNum, active && styles.stripNumOn]}>
                        {format(parsed, 'd')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.startBtn} onPress={() => markPeriodStart(owner, date)}>
              <Text style={styles.startBtnText}>Period started on {format(anchor, 'MMM d')}</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Period on {format(anchor, 'MMM d')}</Text>
            <View style={styles.flowRow}>
              <Pressable
                style={[styles.flowChip, currentFlow === 'yes' && styles.flowChipOn]}
                onPress={() => setFlow('yes')}>
                <Text style={[styles.flowChipText, currentFlow === 'yes' && styles.flowChipTextOn]}>
                  On period
                </Text>
              </Pressable>
            </View>
            {currentFlow !== 'none' ? (
              <Pressable style={styles.clearBtn} onPress={() => setFlow('none')}>
                <Text style={styles.clearBtnText}>Remove period from this day</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyText}>Partner’s shared calendar — view only</Text>
          </View>
        )}

        <Pressable style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const CIRCLE = 36;

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: '#FFFBFC' },
  scroll: { padding: 16, paddingBottom: 48 },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 14,
    textAlign: 'center',
  },
  helpCard: {
    backgroundColor: CYCLE_THEME.accentMuted,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  helpTitle: { fontSize: 13, fontWeight: '700', color: CYCLE_THEME.accentDark, marginBottom: 6 },
  helpText: { fontSize: 13, color: Theme.textSecondary, lineHeight: 19, marginBottom: 6 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  strip: { gap: 8, paddingBottom: 16, paddingHorizontal: 2 },
  stripDay: { alignItems: 'center', width: 44 },
  stripDayAnchor: { opacity: 1 },
  stripWeekday: { fontSize: 10, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  stripCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: CYCLE_THEME.accentLight,
    backgroundColor: Theme.surface,
  },
  stripCircleOn: {
    backgroundColor: CYCLE_THEME.period,
    borderColor: CYCLE_THEME.period,
  },
  stripNum: { fontSize: 15, fontWeight: '600', color: Theme.text },
  stripNumOn: { color: '#fff', fontWeight: '700' },
  startBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: CYCLE_THEME.accentMuted,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  startBtnText: { fontSize: 13, fontWeight: '700', color: CYCLE_THEME.accentDark },
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  flowChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.border,
    backgroundColor: Theme.surface,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  flowChipOn: { backgroundColor: CYCLE_THEME.accentLight, borderColor: CYCLE_THEME.period },
  flowChipText: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },
  flowChipTextOn: { color: CYCLE_THEME.accentDark, fontWeight: '700' },
  clearBtn: { alignSelf: 'center', marginBottom: 8 },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  readOnlyBanner: {
    backgroundColor: CYCLE_THEME.accentLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  readOnlyText: { fontSize: 13, color: CYCLE_THEME.accentDark, fontWeight: '600', textAlign: 'center' },
  doneBtn: {
    marginTop: 8,
    backgroundColor: CYCLE_THEME.period,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
