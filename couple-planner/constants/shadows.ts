import { Platform, ViewStyle } from 'react-native';

export const cardShadow: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
})!;

export const cardShadowSm: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
})!;
