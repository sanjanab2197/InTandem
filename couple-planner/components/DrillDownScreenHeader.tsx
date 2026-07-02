import { Image, Pressable, StyleSheet, Text, View, type ReactNode } from 'react-native';

import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';

const LOGO = require('@/assets/images/intandem-icon.png');
const SIDE_SLOT_WIDTH = 100;

interface DrillDownScreenHeaderProps {
  insetTop: number;
  onBack: () => void;
  backSymbol?: '‹' | '✕';
  contentAlign?: 'center' | 'right';
  children: ReactNode;
  trailing?: ReactNode;
}

export default function DrillDownScreenHeader({
  insetTop,
  onBack,
  backSymbol = '‹',
  contentAlign = 'center',
  children,
  trailing,
}: DrillDownScreenHeaderProps) {
  const isCalendarBack = backSymbol === '‹';
  const alignRight = contentAlign === 'right';

  return (
    <View style={[styles.container, { paddingTop: insetTop + 10 }]}>
      <View style={styles.row}>
        <View style={styles.sideLeft}>
          <Image source={LOGO} style={styles.logo} resizeMode="cover" />
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              isCalendarBack && styles.backBtnLarge,
              pressed && styles.backBtnPressed,
            ]}>
            <Text
              style={[
                styles.backIcon,
                isCalendarBack ? styles.backIconChevron : styles.backIconClose,
              ]}>
              {backSymbol}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.center, alignRight && styles.centerRight]}>{children}</View>

        {trailing ? <View style={styles.sideRight}>{trailing}</View> : null}
      </View>
    </View>
  );
}

export const drillDownHeaderStyles = StyleSheet.create({
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: Theme.primaryDark,
    lineHeight: 30,
    textAlign: 'center',
  },
  eventTitle: {
    fontFamily: Fonts.formSemiBold,
    fontSize: 18,
    letterSpacing: -0.2,
    color: Theme.primaryDark,
    lineHeight: 22,
    textAlign: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navRowRight: {
    justifyContent: 'flex-end',
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navChevron: {
    fontSize: 26,
    fontWeight: '300',
    color: Theme.textSecondary,
    lineHeight: 30,
  },
  dayNumber: {
    fontFamily: Fonts.displayBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: Theme.primaryDark,
    lineHeight: 30,
    minWidth: 32,
    textAlign: 'center',
  },
  saveBtn: {
    minHeight: 40,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    fontFamily: Fonts.formBold,
    color: Theme.primaryDark,
  },
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.surface,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  sideLeft: {
    width: SIDE_SLOT_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  sideRight: {
    width: SIDE_SLOT_WIDTH,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 40,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    flexShrink: 0,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  backBtnLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  backBtnPressed: {
    backgroundColor: Theme.primaryLight,
  },
  backIcon: {
    fontWeight: '300',
    color: Theme.text,
  },
  backIconChevron: {
    fontSize: 32,
    lineHeight: 32,
    marginTop: -1,
  },
  backIconClose: {
    fontSize: 18,
    lineHeight: 18,
    fontFamily: Fonts.formSemiBold,
    color: Theme.primaryDark,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 40,
    paddingHorizontal: 4,
  },
  centerRight: {
    alignItems: 'flex-end',
  },
});
