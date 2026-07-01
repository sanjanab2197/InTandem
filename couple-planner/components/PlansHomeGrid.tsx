import { Pressable, StyleSheet, Text, View } from 'react-native';

import PlanCategoryIcon from '@/components/PlanCategoryIcon';
import { getPlanTheme, PlansUI } from '@/constants/plansTheme';
import { PLAN_CATEGORIES, Theme } from '@/constants/Theme';
import { PlanCategory } from '@/types';

const CARD_BLURBS: Record<PlanCategory, string> = {
  weekly_checklist: 'Lists & to-dos',
  date_ideas: 'Restaurants & dates',
  travel_ideas: 'Trips & packing',
  enrichment_ideas: 'Books & hobbies',
  reminders: 'Shared reminders',
  expenseflow: 'Split expenses',
};

interface PlansHomeGridProps {
  onSelect: (category: PlanCategory) => void;
}

export default function PlansHomeGrid({ onSelect }: PlansHomeGridProps) {
  return (
    <View style={styles.grid}>
      {PLAN_CATEGORIES.map(({ key, label }) => {
        const theme = getPlanTheme(key);
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
              <View style={[styles.iconWrap, { backgroundColor: theme.accentLight }]}>
                <PlanCategoryIcon category={key} color={theme.accentDark} size={24} />
              </View>
              <Text style={[styles.label, { color: theme.accentDark }]} numberOfLines={2}>
                {label}
              </Text>
              <Text style={styles.blurb} numberOfLines={2}>
                {CARD_BLURBS[key]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginTop: 4,
  },
  cardWrap: {
    width: '50%',
    padding: 6,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: 18,
    padding: 16,
    minHeight: 132,
    borderWidth: 1,
    justifyContent: 'flex-end',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  blurb: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 16,
  },
});
