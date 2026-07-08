import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CYCLE_THEME } from '@/constants/cycleTracking';
import { Theme } from '@/constants/Theme';
import type { CycleSaveStatus } from '@/context/AppContext';

interface CycleSaveBannerProps {
  status: CycleSaveStatus;
}

export default function CycleSaveBanner({ status }: CycleSaveBannerProps) {
  const insets = useSafeAreaInsets();

  const saving = status === 'saving';
  const saved = status === 'saved';
  const error = status === 'error';

  const title = saving
    ? 'Saving edits & updating predictions…'
    : saved
      ? 'Predictions updated'
      : 'Saved on device — sync will retry';

  const subtitle = saving
    ? 'Your calendar and fertile window are recalculating'
    : saved
      ? 'Period, ovulation & fertile window saved'
      : 'Check your connection if this keeps happening';

  return (
    <View
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 12) + (Platform.OS === 'web' ? 8 : 56) },
        saving && styles.wrapSaving,
        saved && styles.wrapSaved,
        error && styles.wrapError,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.row}>
        {saving ? (
          <ActivityIndicator size="small" color={CYCLE_THEME.accentDark} style={styles.spinner} />
        ) : (
          <Text style={styles.icon}>{saved ? '✓' : '!'}</Text>
        )}
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#3D2A32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 100,
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' as const } : {}),
  },
  wrapSaving: {
    backgroundColor: '#FFFBFC',
    borderColor: CYCLE_THEME.accentLight,
  },
  wrapSaved: {
    backgroundColor: 'rgba(86, 138, 114, 0.12)',
    borderColor: 'rgba(86, 138, 114, 0.35)',
  },
  wrapError: {
    backgroundColor: 'rgba(217, 98, 130, 0.08)',
    borderColor: 'rgba(217, 98, 130, 0.3)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spinner: { marginLeft: 2 },
  icon: {
    width: 22,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: CYCLE_THEME.accentDark,
  },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Theme.text, marginBottom: 2 },
  subtitle: { fontSize: 12, color: Theme.textSecondary, lineHeight: 16 },
});
