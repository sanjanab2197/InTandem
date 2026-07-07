import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
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
import {
  CYCLE_THEME,
  FLOW_OPTIONS,
  LOG_SECTIONS,
  logValueLabel,
} from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { CycleLogKind, CycleOwner } from '@/types';
import { getOwnerProfile, logsForDate } from '@/utils/cycleTracking';

interface CycleDaySheetProps {
  date: string;
  owner: CycleOwner;
  readOnly?: boolean;
  onClose: () => void;
}

export default function CycleDaySheet({
  date,
  owner,
  readOnly = false,
  onClose,
}: CycleDaySheetProps) {
  const insets = useSafeAreaInsets();
  const { cycleData, setCycleLog, addCustomCycleLog, removeCycleLog, markPeriodStart } = useApp();
  const [customText, setCustomText] = useState('');

  const profile = useMemo(() => getOwnerProfile(cycleData, owner), [cycleData, owner]);
  const dayLogs = useMemo(() => logsForDate(profile, date), [profile, date]);
  const parsed = parseISO(date);
  const title = format(parsed, 'EEEE, MMM d');

  const flowLog = dayLogs.find((l) => l.kind === 'period');
  const currentFlow = flowLog?.value ?? 'none';

  const handleFlow = (value: string) => {
    if (readOnly) return;
    setCycleLog(owner, date, 'period', value);
  };

  const handlePick = (kind: CycleLogKind, value: string) => {
    if (readOnly) return;
    setCycleLog(owner, date, kind, value);
  };

  const isSelected = (kind: CycleLogKind, value: string) =>
    dayLogs.some((l) => l.kind === kind && l.value === value);

  const addCustom = () => {
    if (readOnly || !customText.trim()) return;
    addCustomCycleLog(owner, date, customText);
    setCustomText('');
  };

  return (
    <View style={styles.container}>
      <DrillDownScreenHeader insetTop={insets.top} onBack={onClose} backSymbol="✕">
        <Text style={drillDownHeaderStyles.eventTitle}>{title}</Text>
      </DrillDownScreenHeader>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...(Platform.OS === 'web' ? { style: styles.scrollViewWeb } : {})}>
        {readOnly ? (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyText}>Partner’s shared log — view only</Text>
          </View>
        ) : null}

        <View style={styles.flowCard}>
          <Text style={styles.flowTitle}>Period flow</Text>
          <View style={styles.flowRow}>
            {FLOW_OPTIONS.map((opt) => {
              const selected = currentFlow === opt.key;
              const dotScale =
                opt.key === 'heavy' ? 14 : opt.key === 'medium' ? 11 : opt.key === 'light' ? 8 : opt.key === 'spotting' ? 5 : 0;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.flowOption,
                    selected && styles.flowOptionOn,
                    pressed && !readOnly && styles.pressed,
                  ]}
                  disabled={readOnly}
                  onPress={() => handleFlow(opt.key)}>
                  {dotScale > 0 ? (
                    <View
                      style={[
                        styles.flowDot,
                        { width: dotScale, height: dotScale, borderRadius: dotScale / 2 },
                        selected && styles.flowDotOn,
                      ]}
                    />
                  ) : (
                    <View style={styles.flowNone} />
                  )}
                  <Text style={[styles.flowLabel, selected && styles.flowLabelOn]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {!readOnly ? (
            <Pressable
              style={({ pressed }) => [styles.periodStartBtn, pressed && styles.pressed]}
              onPress={() => markPeriodStart(owner, date)}>
              <Text style={styles.periodStartText}>Period started today</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.gridTitle}>Tap to log</Text>
        {LOG_SECTIONS.map((section) => (
          <View key={section.kind} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{section.emoji}</Text>
              <Text style={styles.sectionLabel}>{section.label}</Text>
            </View>
            <View style={styles.chipRow}>
              {section.options.map((opt) => {
                const selected = isSelected(section.kind, opt.key);
                return (
                  <Pressable
                    key={opt.key}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipOn,
                      pressed && !readOnly && styles.pressed,
                    ]}
                    disabled={readOnly}
                    onPress={() => handlePick(section.kind, opt.key)}>
                    <Text style={[styles.chipText, selected && styles.chipTextOn]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.anythingElse}>
          <Text style={styles.anythingTitle}>Anything else?</Text>
          <Text style={styles.anythingHint}>Travel stress, cravings, appointments — log anything.</Text>
          <View style={styles.anythingRow}>
            <TextInput
              style={styles.anythingInput}
              value={customText}
              onChangeText={setCustomText}
              editable={!readOnly}
              placeholder="Type what you want to remember…"
              placeholderTextColor={Theme.textSecondary}
              onSubmitEditing={addCustom}
              returnKeyType="done"
            />
            {!readOnly ? (
              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  !customText.trim() && styles.addBtnDisabled,
                  pressed && customText.trim() && styles.pressed,
                ]}
                disabled={!customText.trim()}
                onPress={addCustom}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {dayLogs.length > 0 ? (
          <View style={styles.loggedSummary}>
            <Text style={styles.loggedTitle}>Today’s log</Text>
            {dayLogs.map((log) => (
              <View key={log.id} style={styles.loggedRow}>
                <Text style={styles.loggedItem}>
                  {log.kind === 'period'
                    ? `Flow · ${logValueLabel('period', log.value)}`
                    : `${logKindDisplay(log.kind)} · ${logValueLabel(log.kind, log.value, log.notes)}`}
                </Text>
                {!readOnly ? (
                  <Pressable onPress={() => removeCycleLog(owner, log.id)} hitSlop={8}>
                    <Text style={styles.removeLog}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function logKindDisplay(kind: CycleLogKind) {
  const section = LOG_SECTIONS.find((s) => s.kind === kind);
  if (section) return section.label;
  if (kind === 'other') return 'Note';
  return kind;
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: '#FFFBFC' },
  scrollViewWeb: { flex: 1, minHeight: 0 },
  scroll: { padding: 16, paddingBottom: 48 },
  readOnlyBanner: {
    backgroundColor: CYCLE_THEME.accentLight,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  readOnlyText: { fontSize: 12, color: CYCLE_THEME.accentDark, fontWeight: '600' },
  flowCard: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  flowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CYCLE_THEME.accentDark,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flowRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  flowOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Theme.background,
  },
  flowOptionOn: { backgroundColor: CYCLE_THEME.accentLight },
  flowDot: { backgroundColor: '#E8C4CE', marginBottom: 6 },
  flowDotOn: { backgroundColor: CYCLE_THEME.period },
  flowNone: {
    width: 12,
    height: 2,
    backgroundColor: Theme.border,
    marginBottom: 10,
    marginTop: 4,
  },
  flowLabel: { fontSize: 10, fontWeight: '600', color: Theme.textSecondary, textAlign: 'center' },
  flowLabelOn: { color: CYCLE_THEME.accentDark },
  periodStartBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: CYCLE_THEME.accentMuted,
  },
  periodStartText: { fontSize: 12, fontWeight: '700', color: CYCLE_THEME.accentDark },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.textSecondary,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 14,
    marginBottom: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionEmoji: { fontSize: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Theme.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Theme.background,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  chipOn: { backgroundColor: CYCLE_THEME.accentLight, borderColor: CYCLE_THEME.period },
  chipText: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },
  chipTextOn: { color: CYCLE_THEME.accentDark, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  anythingElse: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 14,
    marginTop: 6,
    marginBottom: 14,
  },
  anythingTitle: { fontSize: 15, fontWeight: '700', color: Theme.text, marginBottom: 4 },
  anythingHint: { fontSize: 12, color: Theme.textSecondary, marginBottom: 12, lineHeight: 17 },
  anythingRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  anythingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.text,
    backgroundColor: Theme.background,
  },
  addBtn: {
    backgroundColor: CYCLE_THEME.period,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  loggedSummary: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: CYCLE_THEME.accentMuted,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  loggedTitle: { fontSize: 12, fontWeight: '700', color: CYCLE_THEME.accentDark, marginBottom: 8 },
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  loggedItem: { flex: 1, fontSize: 13, color: Theme.text },
  removeLog: { fontSize: 14, color: Theme.textSecondary, fontWeight: '700' },
});
