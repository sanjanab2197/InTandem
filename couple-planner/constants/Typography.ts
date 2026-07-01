import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { Theme } from '@/constants/Theme';

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
} as const;

export const screenHeaderStyles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  titleAccent: {
    fontSize: 34,
    fontFamily: Fonts.display,
    color: Theme.primary,
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  titleUnderline: {
    width: 56,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Theme.primary,
    marginTop: 11,
    opacity: 0.88,
  },
  hint: {
    marginTop: 11,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Theme.textSecondary,
    lineHeight: 19,
    letterSpacing: 0.25,
  },
  hintOnly: {
    marginTop: 0,
  },
});

export type ScreenHeaderStyle = ViewStyle | TextStyle;
