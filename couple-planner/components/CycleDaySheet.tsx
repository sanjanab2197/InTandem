import { addDays, format, parseISO, subDays } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DrillDownScreenHeader, { drillDownHeaderStyles } from '@/components/DrillDownScreenHeader';
import { CYCLE_THEME, LOG_SECTIONS } from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { CycleLogKind, CycleOwner, isPeriodLogged } from '@/types';
import { getOwnerProfile, logsForDate } from '@/utils/cycleTracking';

const QUICK_KINDS = new Set<CycleLogKind>(['mood', 'symptom', 'energy', 'sleep']);
const QUICK_SECTIONS = LOG_SECTIONS.filter((s) => QUICK_KINDS.has(s.kind));
const MORE_SECTIONS = LOG_SECTIONS.filter((s) => !QUICK_KINDS.has(s.kind));

interface CycleDaySheetProps {
  date: string;
  owner: CycleOwner;
  readOnly?: boolean;
  onClose: () => void;
  onDateChange?: (date: string) => void;
}

export default function CycleDaySheet({
  date,
  owner,
  readOnly = false,
  onClose,
  onDateChange,
}: CycleDaySheetProps) {
  const insets = useSafeAreaInsets();
  const { cycleData, setCycleLog, addCustomCycleLog } = useApp();
  const [activeTab, setActiveTab] = useState<CycleLogKind>('mood');
  const [moreOpen, setMoreOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const profile = useMemo(() => getOwnerProfile(cycleData, owner), [cycleData, owner]);
  const dayLogs = useMemo(() => logsForDate(profile, date), [profile, date]);
  const parsed = parseISO(date);
  const title = format(parsed, 'EEEE, MMM d');

  const onPeriod = isPeriodLogged(dayLogs.find((l) => l.kind === 'period')?.value);

  const shiftDay = useCallback(
    (delta: number) => {
      if (!onDateChange) return;
      const next = delta > 0 ? addDays(parsed, 1) : subDays(parsed, 1);
      onDateChange(format(next, 'yyyy-MM-dd'));
    },
    [onDateChange, parsed]
  );

  const togglePeriod = () => {
    if (readOnly) return;
    setCycleLog(owner, date, 'period', onPeriod ? 'none' : 'yes');
  };

  const handlePick = (kind: CycleLogKind, value: string) => {
    if (readOnly) return;
    setCycleLog(owner, date, kind, value);
  };

  const isSelected = (kind: CycleLogKind, value: string) =>
    dayLogs.some((l) => l.kind === kind && l.value === value);

  const tabHasLog = (kind: CycleLogKind) => dayLogs.some((l) => l.kind === kind);

  const activeSection =
    QUICK_SECTIONS.find((s) => s.kind === activeTab) ?? QUICK_SECTIONS[0];

  const addCustom = () => {
    if (readOnly || !customText.trim()) return;
    addCustomCycleLog(owner, date, customText);
    setCustomText('');
  };

  return (
    <View style={styles.container}>
      <DrillDownScreenHeader
        insetTop={insets.top}
        onBack={onClose}
        backSymbol="✕"
        trailing={
          onDateChange ? (
            <View style={styles.dayNav}>
              <Pressable style={styles.dayNavBtn} onPress={() => shiftDay(-1)} hitSlop={8}>
                <Text style={styles.dayNavBtnText}>‹</Text>
              </Pressable>
              <Pressable style={styles.dayNavBtn} onPress={() => shiftDay(1)} hitSlop={8}>
                <Text style={styles.dayNavBtnText}>›</Text>
              </Pressable>
            </View>
          ) : null
        }>
        <Text style={drillDownHeaderStyles.eventTitle}>{title}</Text>
      </DrillDownScreenHeader>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...(Platform.OS === 'web' ? { style: styles.scrollViewWeb } : {})}>
        {readOnly ? <Text style={styles.readOnlyText}>View only</Text> : null}

        <Pressable
          style={[styles.periodPill, onPeriod && styles.periodPillOn]}
          onPress={togglePeriod}
          disabled={readOnly}>
          <Text style={styles.periodEmoji}>🩸</Text>
          <Text style={[styles.periodText, onPeriod && styles.periodTextOn]}>
            {onPeriod ? 'On period' : 'Log period'}
          </Text>
        </Pressable>

        <View style={styles.tabRow}>
          {QUICK_SECTIONS.map((section) => {
            const active = activeTab === section.kind;
            const logged = tabHasLog(section.kind);
            return (
              <Pressable
                key={section.kind}
                style={[styles.tab, active && styles.tabOn]}
                onPress={() => setActiveTab(section.kind)}>
                <Text style={styles.tabEmoji}>{section.emoji}</Text>
                {logged ? <View style={styles.tabDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.tabLabel}>{activeSection.label}</Text>
        <View style={styles.chipRow}>
          {activeSection.options.map((opt) => {
            const selected = isSelected(activeSection.kind, opt.key);
            return (
              <Chip
                key={opt.key}
                label={opt.label}
                selected={selected}
                readOnly={readOnly}
                onPress={() => handlePick(activeSection.kind, opt.key)}
              />
            );
          })}
        </View>

        <Pressable
          style={styles.moreToggle}
          onPress={() => setMoreOpen((v) => !v)}
          disabled={readOnly && !moreOpen}>
          <Text style={styles.moreToggleText}>{moreOpen ? 'Less' : 'More logs'}</Text>
          <Text style={styles.moreToggleIcon}>{moreOpen ? '▴' : '▾'}</Text>
        </Pressable>

        {moreOpen
          ? MORE_SECTIONS.map((section) => (
              <View key={section.kind} style={styles.moreSection}>
                <Text style={styles.moreSectionLabel}>
                  {section.emoji} {section.label}
                </Text>
                <View style={styles.chipRow}>
                  {section.options.map((opt) => (
                    <Chip
                      key={opt.key}
                      label={opt.label}
                      selected={isSelected(section.kind, opt.key)}
                      readOnly={readOnly}
                      onPress={() => handlePick(section.kind, opt.key)}
                    />
                  ))}
                </View>
              </View>
            ))
          : null}

        {moreOpen && !readOnly ? (
          <TextInput
            style={styles.noteInput}
            value={customText}
            onChangeText={setCustomText}
            placeholder="Note…"
            placeholderTextColor={Theme.textSecondary}
            onSubmitEditing={addCustom}
            returnKeyType="done"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  selected,
  readOnly,
  onPress,
}: {
  label: string;
  selected: boolean;
  readOnly: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipOn]}
      disabled={readOnly}
      onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: '#FFFBFC' },
  scrollViewWeb: { flex: 1, minHeight: 0 },
  scroll: { padding: 16, paddingBottom: 48 },
  readOnlyText: {
    fontSize: 11,
    color: CYCLE_THEME.accentDark,
    fontWeight: '600',
    marginBottom: 10,
  },
  dayNav: { flexDirection: 'row', gap: 6 },
  dayNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: CYCLE_THEME.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNavBtnText: { fontSize: 20, fontWeight: '600', color: CYCLE_THEME.accentDark, marginTop: -2 },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Theme.surface,
    borderWidth: 1.5,
    borderColor: Theme.border,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  periodPillOn: {
    backgroundColor: CYCLE_THEME.period,
    borderColor: CYCLE_THEME.period,
  },
  periodEmoji: { fontSize: 18 },
  periodText: { fontSize: 15, fontWeight: '700', color: Theme.text },
  periodTextOn: { color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tab: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  tabOn: {
    backgroundColor: CYCLE_THEME.accentLight,
    borderColor: CYCLE_THEME.period,
  },
  tabEmoji: { fontSize: 20 },
  tabDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CYCLE_THEME.period,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.border,
    backgroundColor: Theme.surface,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  chipOn: { backgroundColor: CYCLE_THEME.accentLight, borderColor: CYCLE_THEME.period },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  chipTextOn: { color: CYCLE_THEME.accentDark },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginTop: 8,
  },
  moreToggleText: { fontSize: 13, fontWeight: '600', color: CYCLE_THEME.accentDark },
  moreToggleIcon: { fontSize: 10, color: CYCLE_THEME.accentDark },
  moreSection: { marginBottom: 12 },
  moreSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Theme.text,
    backgroundColor: Theme.surface,
    marginTop: 4,
  },
});
