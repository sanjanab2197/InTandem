import { ReactNode } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';

import { screenHeaderStyles } from '@/constants/Typography';

interface ScreenHeaderProps {
  title: string;
  hint: string;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({ title, hint, footer, style }: ScreenHeaderProps) {
  return (
    <View style={[screenHeaderStyles.header, style]}>
      <Text style={screenHeaderStyles.titleAccent}>{title}</Text>
      <View style={screenHeaderStyles.titleUnderline} />
      <Text style={screenHeaderStyles.hint}>{hint}</Text>
      {footer}
    </View>
  );
}
