import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PlanCategoryIcon from '@/components/PlanCategoryIcon';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Fonts } from '@/constants/Typography';
import { Theme } from '@/constants/Theme';
import { PlanCategory } from '@/types';

interface PlanSectionHeaderProps {
  category: PlanCategory;
  theme: PlanCategoryTheme;
  title: string;
  hint: string;
  onBack?: () => void;
  backLabel?: string;
  footer?: ReactNode;
}

function backLabelText(label: string) {
  return label.replace(/^←\s*/, '').trim();
}

export default function PlanSectionHeader({
  category,
  theme,
  title,
  hint,
  onBack,
  backLabel = '← Organizer',
  footer,
}: PlanSectionHeaderProps) {
  const backText = backLabelText(backLabel);

  return (
    <View
      style={[
        styles.card,
        PlansUI.cardShadow,
        { backgroundColor: theme.accentMuted, borderColor: theme.accentLight },
      ]}>
      {onBack ? (
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={onBack}
          hitSlop={8}>
          <Text style={[styles.backChevron, { color: theme.accent }]}>‹</Text>
          <Text style={[styles.backText, { color: theme.accent }]}>{backText}</Text>
        </Pressable>
      ) : null}

      <View style={styles.iconArea}>
        <View style={[styles.iconGlow, { backgroundColor: theme.accentLight }]} />
        <View style={[styles.iconWrap, { backgroundColor: theme.accentLight }]}>
          <PlanCategoryIcon category={category} color={theme.accentDark} size={26} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.accentDark }]}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>

      {footer ? <View style={[styles.footer, { borderTopColor: theme.accentLight }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginLeft: -2,
    paddingVertical: 2,
    paddingRight: 8,
  },
  backBtnPressed: {
    opacity: 0.65,
  },
  backChevron: {
    fontSize: 22,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    lineHeight: 22,
    marginRight: 2,
    marginTop: -1,
  },
  backText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  iconArea: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.55,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: -1.1,
    lineHeight: 36,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Theme.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.1,
    maxWidth: '92%',
  },
  footer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
