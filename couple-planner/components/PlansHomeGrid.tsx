import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import PlanCategoryIcon from '@/components/PlanCategoryIcon';
import { getPlanTheme, PlansUI } from '@/constants/plansTheme';
import { Fonts } from '@/constants/Typography';
import { PLAN_CATEGORIES, Theme } from '@/constants/Theme';
import { PlanCategory, PlanItem, Reminder } from '@/types';

const CARD_BLURBS: Record<PlanCategory, string> = {
  weekly_checklist: 'Lists & to-dos',
  date_ideas: 'Restaurants & dates',
  travel_ideas: 'Trips & packing',
  enrichment_ideas: 'Books & hobbies',
  reminders: 'Shared reminders',
  key_dates: 'Birthdays & anniversaries',
  ai_agent: 'Trips, food & stays',
  ai_meal: 'Meals from groceries',
  expenseflow: 'Split expenses',
};

const GROUPS: { title: string; keys: PlanCategory[] }[] = [
  {
    title: 'Together',
    keys: ['weekly_checklist', 'reminders', 'key_dates', 'expenseflow'],
  },
  {
    title: 'Ideas',
    keys: ['date_ideas', 'travel_ideas', 'enrichment_ideas'],
  },
  {
    title: 'Smart tools',
    keys: ['ai_agent', 'ai_meal'],
  },
];

interface PlansHomeGridProps {
  planItems: PlanItem[];
  reminders: Reminder[];
  onSelect: (category: PlanCategory) => void;
}

function openCountForCategory(
  key: PlanCategory,
  planItems: PlanItem[],
  reminders: Reminder[]
): number {
  if (key === 'reminders') return reminders.filter((r) => !r.completed).length;
  if (
    key === 'key_dates' ||
    key === 'ai_agent' ||
    key === 'ai_meal' ||
    key === 'expenseflow'
  ) {
    return 0;
  }
  return planItems.filter((item) => item.category === key && !item.completed).length;
}

export default function PlansHomeGrid({ planItems, reminders, onSelect }: PlansHomeGridProps) {
  const counts = useMemo(() => {
    const map = {} as Record<PlanCategory, number>;
    for (const { key } of PLAN_CATEGORIES) {
      map[key] = openCountForCategory(key, planItems, reminders);
    }
    return map;
  }, [planItems, reminders]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.summaryTitle}>Spaces</Text>

      {GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.grid}>
            {group.keys.map((key) => {
              const meta = PLAN_CATEGORIES.find((c) => c.key === key)!;
              const theme = getPlanTheme(key);
              const open = counts[key];
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}
                  onPress={() => onSelect(key)}>
                  <View
                    style={[
                      styles.card,
                      PlansUI.cardShadow,
                      { backgroundColor: theme.accentMuted, borderColor: theme.accentLight },
                    ]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.iconWrap, { backgroundColor: theme.accentLight }]}>
                        <PlanCategoryIcon category={key} color={theme.accentDark} size={20} />
                      </View>
                      {open > 0 ? (
                        <View style={[styles.cardBadge, { backgroundColor: theme.accent }]}>
                          <Text style={styles.cardBadgeText}>{open}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.label, { color: theme.accentDark }]} numberOfLines={1}>
                      {meta.label}
                    </Text>
                    <Text style={styles.blurb} numberOfLines={1}>
                      {CARD_BLURBS[key]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  summaryTitle: {
    fontSize: 22,
    fontFamily: Fonts.semiBold,
    color: Theme.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  cardWrap: {
    width: '50%',
    padding: 5,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  card: {
    borderRadius: 16,
    padding: 14,
    minHeight: 108,
    borderWidth: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cardBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  label: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 2,
  },
  blurb: {
    fontSize: 11,
    color: Theme.textSecondary,
    lineHeight: 14,
  },
});
