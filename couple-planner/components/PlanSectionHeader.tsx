import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PlanCategoryIcon from '@/components/PlanCategoryIcon';
import { PlanCategoryTheme } from '@/constants/plansTheme';
import { Fonts } from '@/constants/Typography';
import { Theme } from '@/constants/Theme';
import { PlanCategory } from '@/types';

interface PlanSectionHeaderProps {
  category: PlanCategory;
  theme: PlanCategoryTheme;
  title: string;
  hint?: string;
  onBack?: () => void;
  backLabel?: string;
  footer?: ReactNode;
}

export default function PlanSectionHeader({
  category,
  theme,
  title,
  hint,
  onBack,
  backLabel = 'Organizer',
  footer,
}: PlanSectionHeaderProps) {
  return (
    <View style={[styles.wrap, { borderColor: theme.accentLight, backgroundColor: theme.accentMuted }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}
            onPress={onBack}
            hitSlop={6}>
            <Text style={[styles.backChevron, { color: theme.accent }]}>‹</Text>
            <Text style={[styles.backText, { color: theme.accent }]}>{backLabel}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={[styles.iconChip, { backgroundColor: theme.accentLight }]}>
          <PlanCategoryIcon category={category} color={theme.accentDark} size={18} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.accentDark }]}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {footer ? <View style={[styles.footer, { borderTopColor: theme.accentLight }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  backPillPressed: { opacity: 0.7 },
  backChevron: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    lineHeight: 18,
    marginRight: 2,
    marginTop: -1,
  },
  backText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 28,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Theme.textSecondary,
    lineHeight: 17,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
