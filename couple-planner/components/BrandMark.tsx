import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Theme } from '@/constants/Theme';

interface BrandMarkProps {
  tagline?: string | null;
  subtitle?: string | null;
  compact?: boolean;
  style?: ViewStyle;
}

export default function BrandMark({ tagline, subtitle, compact, style }: BrandMarkProps) {
  const iconSize = compact ? 56 : 84;

  if (compact) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.row}>
          <Image
            source={require('@/assets/images/intandem-icon.png')}
            style={[styles.icon, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }]}
            resizeMode="cover"
            accessibilityLabel="InTandem logo"
          />
          <Text style={[styles.brand, styles.brandCompact]}>InTandem</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, styles.wrapHero, style]}>
      <View style={styles.iconHalo}>
        <Image
          source={require('@/assets/images/intandem-icon.png')}
          style={[styles.icon, styles.iconHero, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }]}
          resizeMode="cover"
          accessibilityLabel="InTandem logo"
        />
      </View>
      <Text style={styles.brand}>InTandem</Text>
      {tagline ? (
        <View style={styles.taglineWrap}>
          <View style={styles.taglineRule} />
          <Text style={styles.tagline}>{tagline}</Text>
        </View>
      ) : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 8 },
  wrapHero: { marginBottom: 28, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconHalo: {
    padding: 6,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 111, 212, 0.12)',
    marginBottom: 16,
  },
  icon: {
    shadowColor: Theme.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  iconHero: {
    shadowOpacity: 0.35,
  },
  brand: {
    fontFamily: 'Inter_700Bold',
    fontSize: 38,
    letterSpacing: -1,
    color: Theme.text,
  },
  brandCompact: {
    fontSize: 28,
    letterSpacing: -0.6,
  },
  taglineWrap: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 12,
    maxWidth: 320,
  },
  taglineRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: Theme.primary,
    opacity: 0.45,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 15,
    color: Theme.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontStyle: 'italic',
    lineHeight: 23,
    letterSpacing: 0.15,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: Theme.primary,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
});
