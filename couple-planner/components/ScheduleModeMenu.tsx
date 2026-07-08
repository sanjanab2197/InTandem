import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CYCLE_THEME } from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';

interface ScheduleCycleToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export default function ScheduleCycleToggle({ enabled, onEnabledChange }: ScheduleCycleToggleProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.segment, !enabled && styles.segmentOn]}
        onPress={() => onEnabledChange(false)}
        accessibilityRole="button"
        accessibilityState={{ selected: !enabled }}>
        <Text style={[styles.segmentText, !enabled && styles.segmentTextOn]}>Schedule</Text>
      </Pressable>
      <Pressable
        style={[styles.segment, enabled && styles.segmentOnCycle]}
        onPress={() => onEnabledChange(true)}
        accessibilityRole="button"
        accessibilityState={{ selected: enabled }}>
        <Text style={[styles.segmentText, enabled && styles.segmentTextOnCycle]}>Cycle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  segmentOn: {
    backgroundColor: Theme.primaryLight,
  },
  segmentOnCycle: {
    backgroundColor: CYCLE_THEME.accentLight,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Theme.textSecondary,
  },
  segmentTextOn: {
    color: Theme.primaryDark,
  },
  segmentTextOnCycle: {
    color: CYCLE_THEME.accentDark,
  },
});
