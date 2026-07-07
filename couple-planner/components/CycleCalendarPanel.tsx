import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import CalendarGrid from '@/components/CalendarGrid';
import {
  CYCLE_THEME,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { CycleOwner } from '@/types';
import {
  buildCycleCalendarMarkers,
  computeCyclePredictions,
  cycleHeadline,
  cycleLengthLabel,
  formatPredictionDate,
} from '@/utils/cyclePredictions';
import { cycleOwnerFromSlot } from '@/utils/cycleTracking';
import { getParticipantTheme, partnerTabLabel } from '@/utils/participant';

interface CycleCalendarPanelProps {
  selectedDate?: string;
  onDayPress: (date: string, owner: CycleOwner) => void;
  onDayLongPress?: (date: string, owner: CycleOwner) => void;
}

export default function CycleCalendarPanel({ selectedDate, onDayPress, onDayLongPress }: CycleCalendarPanelProps) {
  const { couple } = useCouple();
  const { cycleData, getCycleProfile, canViewCycleProfile, updateCycleSettings } = useApp();
  const [viewOwner, setViewOwner] = useState<CycleOwner>(() => cycleOwnerFromSlot(couple?.mySlot));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cycleLenDraft, setCycleLenDraft] = useState('');
  const [periodLenDraft, setPeriodLenDraft] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() =>
    selectedDate ? parseISO(selectedDate) : new Date()
  );

  const myOwner = cycleOwnerFromSlot(couple?.mySlot);
  const myProfile = getCycleProfile(myOwner);
  const p1Name = partnerTabLabel(couple?.partner1Name ?? 'Partner 1');
  const p2Name = partnerTabLabel(couple?.partner2Name ?? 'Partner 2');

  useEffect(() => {
    setViewOwner(cycleOwnerFromSlot(couple?.mySlot));
  }, [couple?.mySlot]);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(parseISO(selectedDate));
  }, [selectedDate]);

  const owners: { key: CycleOwner; label: string }[] = [
    { key: 'partner1', label: p1Name },
    { key: 'partner2', label: p2Name },
  ];

  const visibleOwners = owners.filter((o) => canViewCycleProfile(o.key, couple?.mySlot));
  const activeOwner = visibleOwners.some((o) => o.key === viewOwner) ? viewOwner : myOwner;
  const profile = useMemo(
    () => getCycleProfile(activeOwner),
    [getCycleProfile, activeOwner, cycleData]
  );
  const predictions = useMemo(() => computeCyclePredictions(profile), [profile]);
  const headline = useMemo(() => cycleHeadline(predictions), [predictions]);
  const isOwnProfile = activeOwner === myOwner;
  const sharing = myProfile.settings.shareWithPartner;

  const cycleMarkers = useMemo(
    () => buildCycleCalendarMarkers(profile, startOfMonth(visibleMonth), endOfMonth(visibleMonth)),
    [profile, visibleMonth]
  );

  const toggleShare = (next: boolean) => {
    updateCycleSettings(myOwner, { shareWithPartner: next });
  };

  const openSettings = () => {
    setCycleLenDraft(String(profile.settings.averageCycleLength || DEFAULT_CYCLE_LENGTH));
    setPeriodLenDraft(String(profile.settings.averagePeriodLength || DEFAULT_PERIOD_LENGTH));
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const cycleLen = Number.parseInt(cycleLenDraft, 10);
    const periodLen = Number.parseInt(periodLenDraft, 10);
    updateCycleSettings(activeOwner, {
      averageCycleLength: Number.isFinite(cycleLen)
        ? Math.min(Math.max(cycleLen, 21), 45)
        : DEFAULT_CYCLE_LENGTH,
      averagePeriodLength: Number.isFinite(periodLen)
        ? Math.min(Math.max(periodLen, 2), 10)
        : DEFAULT_PERIOD_LENGTH,
    });
    setSettingsOpen(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Your cycle</Text>
        <Text style={styles.heroHeadline}>{headline}</Text>
        <Text style={styles.heroCycleLength}>{cycleLengthLabel(predictions)}</Text>
        <View style={styles.heroStats}>
          <HeroPill label="Next period" value={formatPredictionDate(predictions.nextPeriodStart)} />
          <HeroPill label="Ovulation" value={formatPredictionDate(predictions.ovulationDate)} />
        </View>
        {isOwnProfile ? (
          <Pressable style={styles.editLink} onPress={openSettings}>
            <Text style={styles.editLinkText}>Edit cycle length</Text>
          </Pressable>
        ) : null}
      </View>

      {visibleOwners.length > 1 ? (
        <View style={styles.ownerRow}>
          {visibleOwners.map(({ key, label }) => {
            const theme = getParticipantTheme(key);
            const active = activeOwner === key;
            return (
              <Pressable
                key={key}
                style={[styles.ownerChip, active && { backgroundColor: theme.colorLight, borderColor: theme.color }]}
                onPress={() => setViewOwner(key)}>
                <Text style={[styles.ownerChipText, active && { color: theme.colorDark, fontWeight: '700' }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!isOwnProfile ? (
        <Text style={styles.partnerBanner}>Viewing your partner’s shared cycle</Text>
      ) : (
        <View style={styles.shareCard}>
          <Pressable
            style={styles.shareMain}
            onPress={() => toggleShare(!sharing)}
            accessibilityRole="switch"
            accessibilityState={{ checked: sharing }}>
            <View style={styles.shareIconWrap}>
              <Text style={styles.shareIcon}>{sharing ? '👥' : '🔒'}</Text>
            </View>
            <View style={styles.shareText}>
              <Text style={styles.shareLabel}>Share with partner</Text>
              <Text style={styles.shareHint}>
                {sharing ? 'They can see your calendar & logs' : 'Private — only you can see this'}
              </Text>
            </View>
          </Pressable>
          <Switch
            value={sharing}
            onValueChange={toggleShare}
            trackColor={{ false: '#E8DFE3', true: CYCLE_THEME.period }}
            thumbColor="#fff"
            ios_backgroundColor="#E8DFE3"
            {...(Platform.OS === 'web' ? { style: styles.webSwitch } : {})}
          />
        </View>
      )}

      <CalendarGrid
        events={[]}
        variant="cycle"
        cycleMarkers={cycleMarkers}
        selectedDate={selectedDate}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={setVisibleMonth}
        onDayPress={(dateStr) => onDayPress(dateStr, activeOwner)}
        onDayLongPress={
          isOwnProfile && onDayLongPress
            ? (dateStr) => onDayLongPress(dateStr, activeOwner)
            : undefined
        }
      />

      <View style={styles.legend}>
        <LegendItem color={CYCLE_THEME.period} label="Period" dot />
        <LegendItem color={CYCLE_THEME.periodPredicted} label="Predicted" />
        <LegendItem color="rgba(255, 236, 200, 0.9)" label="Fertile" />
        <LegendItem color={CYCLE_THEME.ovulation} label="Ovulation" dot />
        <LegendEmoji emoji="🙂" label="Mood" />
        <LegendEmoji emoji="🩺" label="Symptoms" />
        <LegendEmoji emoji="💕" label="Sex" />
      </View>

      <Text style={styles.hint}>
        Tap a day to log · Long-press to edit period days (3, 7, or however long yours is)
      </Text>

      {settingsOpen && isOwnProfile ? (
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Cycle settings</Text>
          <Text style={styles.fieldLabel}>Average cycle (days)</Text>
          <Text style={styles.fieldHint}>
            Used until you log 2+ period starts — then we estimate from your history.
          </Text>
          <TextInput
            style={styles.input}
            value={cycleLenDraft}
            onChangeText={setCycleLenDraft}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.fieldLabel}>Average period (days)</Text>
          <TextInput
            style={styles.input}
            value={periodLenDraft}
            onChangeText={setPeriodLenDraft}
            keyboardType="number-pad"
            maxLength={2}
          />
          <View style={styles.settingsActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setSettingsOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, { backgroundColor: CYCLE_THEME.period }]} onPress={saveSettings}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroPill}>
      <Text style={styles.heroPillLabel}>{label}</Text>
      <Text style={styles.heroPillValue}>{value}</Text>
    </View>
  );
}

function LegendEmoji({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <Text style={styles.legendEmoji}>{emoji}</Text>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, label, dot }: { color: string; label: string; dot?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[dot ? styles.legendDot : styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  hero: {
    backgroundColor: CYCLE_THEME.accentMuted,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: CYCLE_THEME.accentDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroHeadline: {
    fontSize: 22,
    fontFamily: Fonts.displayBold,
    color: CYCLE_THEME.accentDark,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 6,
  },
  heroCycleLength: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },
  heroStats: { flexDirection: 'row', gap: 10 },
  heroPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroPillLabel: { fontSize: 11, color: Theme.textSecondary, marginBottom: 2 },
  heroPillValue: { fontSize: 15, fontWeight: '700', color: Theme.text },
  editLink: { marginTop: 12, alignSelf: 'flex-start' },
  editLinkText: { fontSize: 13, fontWeight: '600', color: CYCLE_THEME.accentDark },
  ownerRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ownerChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
    backgroundColor: Theme.surface,
  },
  ownerChipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  partnerBanner: {
    fontSize: 12,
    color: CYCLE_THEME.accentDark,
    backgroundColor: CYCLE_THEME.accentLight,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  shareMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CYCLE_THEME.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: { fontSize: 18 },
  shareText: { flex: 1 },
  shareLabel: { fontSize: 14, fontWeight: '700', color: Theme.text },
  shareHint: { fontSize: 12, color: Theme.textSecondary, marginTop: 2, lineHeight: 16 },
  webSwitch: { transform: [{ scale: 0.95 }] },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 10, borderRadius: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendEmoji: { fontSize: 12, lineHeight: 14 },
  legendLabel: { fontSize: 12, color: Theme.textSecondary, fontWeight: '600' },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  settingsCard: {
    marginTop: 16,
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 16,
  },
  settingsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: Theme.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary, marginBottom: 6 },
  fieldHint: { fontSize: 11, color: Theme.textSecondary, marginBottom: 8, lineHeight: 15 },
  input: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Theme.text,
    marginBottom: 12,
  },
  settingsActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
