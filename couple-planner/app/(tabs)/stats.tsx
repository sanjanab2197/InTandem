import { addMonths, format, subMonths } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CategoryRadialChart from '@/components/CategoryRadialChart';
import ScreenHeader from '@/components/ScreenHeader';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { StatsView } from '@/types';
import { filterEventsByStatsView, firstName } from '@/utils/participant';
import { computeCategoryStats, filterEventsForMonth } from '@/utils/stats';

export default function StatsScreen() {
  const {
    events,
    eventCategories,
    weeklyGoals,
    updateWeeklyGoals,
    profile,
  } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statsView, setStatsView] = useState<StatsView>('partner1');
  const [showGoals, setShowGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState(weeklyGoals);

  const p1Name = firstName(profile.partner1Name);
  const p2Name = firstName(profile.partner2Name);

  useEffect(() => {
    if (showGoals) setGoalDraft(weeklyGoals);
  }, [showGoals, weeklyGoals]);

  const monthEvents = useMemo(() => {
    const inMonth = filterEventsForMonth(events, currentMonth);
    return filterEventsByStatsView(inMonth, statsView);
  }, [events, currentMonth, statsView]);

  const categoryStats = useMemo(
    () =>
      eventCategories.map((category) => {
        const stats = computeCategoryStats(
          monthEvents,
          category,
          weeklyGoals[category.key] ?? 0,
          currentMonth
        );
        return {
          key: category.key,
          label: category.label,
          stats,
          color: category.color,
          segments: category.subcategories.map((sub) => ({
            key: sub.key,
            label: sub.label,
            days: stats.subcategories[sub.key]?.days ?? 0,
            color: sub.color,
          })),
        };
      }),
    [monthEvents, weeklyGoals, currentMonth, eventCategories]
  );

  const saveGoals = () => {
    const parsed: typeof weeklyGoals = {};
    eventCategories.forEach(({ key }) => {
      parsed[key] = Math.max(0, Math.min(7, goalDraft[key] ?? 0));
    });
    updateWeeklyGoals(parsed);
    setGoalDraft(parsed);
    setShowGoals(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Statistics" hint="See monthly progress toward your goals" />

        <View style={styles.monthNav}>
          <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>

        <Pressable style={styles.goalsToggle} onPress={() => setShowGoals(!showGoals)}>
          <Text style={styles.goalsToggleText}>
            {showGoals ? 'Hide weekly goals' : 'Set weekly goals (days per week)'}
          </Text>
        </Pressable>

        {showGoals && (
          <View style={styles.goalsPanel}>
            {eventCategories.map(({ key, label }) => (
              <View key={key} style={styles.goalRow}>
                <Text style={styles.goalLabel}>{label}</Text>
                <View style={styles.goalInputWrap}>
                  <Pressable
                    style={styles.goalBtn}
                    onPress={() =>
                      setGoalDraft({ ...goalDraft, [key]: Math.max(0, (goalDraft[key] ?? 0) - 1) })
                    }>
                    <Text style={styles.goalBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.goalValue}>{goalDraft[key] ?? 0}</Text>
                  <Pressable
                    style={styles.goalBtn}
                    onPress={() =>
                      setGoalDraft({ ...goalDraft, [key]: Math.min(7, (goalDraft[key] ?? 0) + 1) })
                    }>
                    <Text style={styles.goalBtnText}>+</Text>
                  </Pressable>
                  <Text style={styles.goalUnit}>days/wk</Text>
                </View>
              </View>
            ))}
            <Pressable style={styles.saveGoalsBtn} onPress={saveGoals}>
              <Text style={styles.saveGoalsText}>Save Goals</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.viewPicker}>
          {(
            [
              { key: 'partner1' as StatsView, label: p1Name },
              { key: 'partner2' as StatsView, label: p2Name },
            ] as const
          ).map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.viewBtn, statsView === key && styles.viewBtnActive]}
              onPress={() => setStatsView(key)}>
              <Text style={[styles.viewBtnText, statsView === key && styles.viewBtnTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.viewHint}>
          Together activities count for both · solo activities count for that partner only
        </Text>

        <Text style={styles.legendHint}>
          Center % is monthly goal progress · outer ring = weekly target · inner bars = what you did
        </Text>

        <View style={styles.grid}>
          {categoryStats.map(({ key, label, stats, color, segments }) => (
            <CategoryRadialChart
              key={key}
              title={label}
              color={color}
              percentage={stats.percentage}
              hasGoal={stats.hasGoal}
              goalDays={stats.monthlyGoalDays}
              totalHours={stats.totalHours}
              segments={segments}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  scroll: { padding: 20, paddingBottom: 40 },
  monthNav: {
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
  navText: { fontSize: 22, color: Theme.primaryDark, fontWeight: '600', marginTop: -2 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  goalsToggle: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  goalsToggleText: { fontSize: 14, fontWeight: '600', color: Theme.primary, textAlign: 'center' },
  goalsPanel: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalLabel: { fontSize: 15, fontWeight: '600', color: Theme.text, flex: 1 },
  goalInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBtnText: { fontSize: 18, color: Theme.primaryDark, fontWeight: '600' },
  goalValue: { fontSize: 18, fontWeight: '800', color: Theme.text, minWidth: 20, textAlign: 'center' },
  goalUnit: { fontSize: 12, color: Theme.textSecondary },
  saveGoalsBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveGoalsText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  viewPicker: {
    flexDirection: 'row',
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewBtnActive: { backgroundColor: Theme.primary },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  viewBtnTextActive: { color: '#fff' },
  viewHint: {
    fontSize: 12,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  legendHint: {
    fontSize: 12,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
});
