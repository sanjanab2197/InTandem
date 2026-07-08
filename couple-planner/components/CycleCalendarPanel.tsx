import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import CycleStepper from '@/components/CycleStepper';
import { CYCLE_THEME } from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';
import { getParticipantTheme } from '@/utils/participant';

import { useCycleCalendarView } from '@/components/useCycleCalendarView';

type CycleView = ReturnType<typeof useCycleCalendarView>;

interface CycleCalendarPanelProps {
  cycle: CycleView;
  placement?: 'header' | 'footer';
}

function CycleSettingsForm({ cycle }: { cycle: CycleView }) {
  const cycleLen = Number.parseInt(cycle.cycleLenDraft, 10) || 28;
  const periodLen = Number.parseInt(cycle.periodLenDraft, 10) || 5;

  return (
    <View style={styles.settingsCard}>
      <CycleStepper
        label="Cycle length"
        value={cycleLen}
        min={21}
        max={45}
        onChange={(v) => cycle.setCycleLenDraft(String(v))}
      />
      <CycleStepper
        label="Period length"
        value={periodLen}
        min={2}
        max={10}
        onChange={(v) => cycle.setPeriodLenDraft(String(v))}
      />
      <View style={styles.settingsActions}>
        <Pressable style={styles.cancelBtn} onPress={() => cycle.setSettingsOpen(false)}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: CYCLE_THEME.period }]}
          onPress={cycle.saveSettings}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CycleCalendarPanel({ cycle, placement = 'header' }: CycleCalendarPanelProps) {
  const [focusedStat, setFocusedStat] = useState<string | null>(null);

  const statCards = useMemo(
    () => [
      { key: 'period', label: 'Period', value: cycle.nextPeriod, emoji: '🩸' },
      { key: 'fertile', label: 'Fertile', value: cycle.fertileWindow, emoji: '✨' },
      { key: 'ovulation', label: 'Ovulation', value: cycle.ovulation, emoji: '🌸' },
    ],
    [cycle.nextPeriod, cycle.fertileWindow, cycle.ovulation]
  );

  if (placement === 'footer') {
    return (
      <View style={styles.footer}>
        <View style={styles.legend}>
          <LegendDot color={CYCLE_THEME.period} />
          <LegendDot color={CYCLE_THEME.periodPredicted} />
          <LegendDot color="rgba(255, 236, 200, 0.9)" />
          <LegendDot color={CYCLE_THEME.ovulation} />
        </View>
        <Text style={styles.hint}>Long-press to log · Tap to select</Text>
      </View>
    );
  }

  return (
    <View style={styles.headerBlock}>
      <View style={styles.topRow}>
        <View style={styles.headlineCol}>
          <Text style={styles.headline} numberOfLines={2}>
            {cycle.headline}
          </Text>
          <Text style={styles.cycleMeta}>{cycle.cycleLengthLabel}</Text>
        </View>
        {cycle.isOwnProfile ? (
          <Pressable
            style={({ pressed }) => [styles.gearBtn, pressed && styles.gearBtnPressed]}
            onPress={() => (cycle.settingsOpen ? cycle.setSettingsOpen(false) : cycle.openSettings())}
            hitSlop={8}
            accessibilityLabel="Cycle settings">
            <Text style={styles.gearIcon}>{cycle.settingsOpen ? '✕' : '⚙'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statRow}>
        {statCards.map((card) => {
          const focused = focusedStat === card.key;
          return (
            <Pressable
              key={card.key}
              style={({ pressed }) => [
                styles.statPill,
                (focused || pressed) && styles.statPillActive,
              ]}
              onPress={() => setFocusedStat((k) => (k === card.key ? null : card.key))}>
              <Text style={styles.statEmoji}>{card.emoji}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {card.value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {cycle.settingsOpen && cycle.isOwnProfile ? <CycleSettingsForm cycle={cycle} /> : null}

      {cycle.visibleOwners.length > 1 ? (
        <View style={styles.ownerRow}>
          {cycle.visibleOwners.map(({ key, label }) => {
            const theme = getParticipantTheme(key);
            const active = cycle.activeOwner === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.ownerPill,
                  active && { backgroundColor: theme.colorLight, borderColor: theme.color },
                ]}
                onPress={() => cycle.setViewOwner(key)}>
                <Text style={[styles.ownerPillText, active && { color: theme.colorDark }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {cycle.isOwnProfile ? (
        <View style={styles.shareRow}>
          <Text style={styles.shareLabel}>Share with partner</Text>
          <Switch
            value={cycle.sharing}
            onValueChange={cycle.toggleShare}
            trackColor={{ false: '#E8DFE3', true: CYCLE_THEME.period }}
            thumbColor="#fff"
            ios_backgroundColor="#E8DFE3"
            {...(Platform.OS === 'web' ? { style: styles.webSwitch } : {})}
          />
        </View>
      ) : (
        <Text style={styles.partnerNote}>Partner view</Text>
      )}
    </View>
  );
}

function LegendDot({ color }: { color: string }) {
  return <View style={[styles.legendDot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  headerBlock: {
    backgroundColor: CYCLE_THEME.accentMuted,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headlineCol: { flex: 1 },
  headline: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: CYCLE_THEME.accentDark,
    lineHeight: 24,
  },
  cycleMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginTop: 4,
  },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  gearBtnPressed: { opacity: 0.75 },
  gearIcon: { fontSize: 16 },
  statRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  statPillActive: {
    backgroundColor: '#fff',
    borderColor: CYCLE_THEME.period,
  },
  statEmoji: { fontSize: 14, marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600', color: Theme.textSecondary, marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: '700', color: Theme.text, textAlign: 'center' },
  ownerRow: { flexDirection: 'row', gap: 8 },
  ownerPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  ownerPillText: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  shareLabel: { fontSize: 13, fontWeight: '600', color: Theme.text },
  partnerNote: {
    fontSize: 12,
    fontWeight: '600',
    color: CYCLE_THEME.accentDark,
    textAlign: 'center',
  },
  webSwitch: { transform: [{ scale: 0.9 }] },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: CYCLE_THEME.accentLight,
  },
  settingsActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  footer: { marginTop: 8, gap: 6 },
  legend: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  hint: {
    fontSize: 11,
    color: Theme.textSecondary,
    paddingHorizontal: 4,
  },
});
