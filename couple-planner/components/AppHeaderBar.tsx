import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';
import { cardShadowSm } from '@/constants/shadows';
import { useOrganizerNavOptional } from '@/context/OrganizerNavContext';

function getHeaderTitle(pathname: string): string {
  if (pathname.includes('/plans')) return 'Organizer';
  if (pathname.includes('/stats')) return 'Statistics';
  if (pathname.includes('/profile')) return 'Profile';
  return 'Schedule';
}

export default function AppHeaderBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const defaultTitle = getHeaderTitle(pathname);
  const organizerNav = useOrganizerNavOptional();

  const isPlans = pathname.includes('/plans');
  const isCalendar = pathname === '/' || pathname === '/index' || pathname.endsWith('/index');
  const drillIn = isPlans && organizerNav?.nav;
  const accent = drillIn ? organizerNav.nav!.accent ?? Theme.primary : Theme.primary;

  const goToCalendar = () => {
    if (!isCalendar) router.push('/');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {drillIn && accent ? (
        <View style={[styles.accentStripe, { backgroundColor: accent }]} />
      ) : null}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.logoFrame, pressed && !isCalendar && styles.logoFramePressed]}
          onPress={goToCalendar}
          disabled={isCalendar}
          accessibilityRole="button"
          accessibilityLabel={isCalendar ? 'InTandem' : 'Go to Schedule'}>
          <Image
            source={require('@/assets/images/intandem-icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.titleCol}>
          {drillIn ? (
            <View style={styles.drillBlock}>
              {organizerNav.nav!.subtitle ? (
                <Text style={[styles.eyebrow, { color: accent }]} numberOfLines={1}>
                  {organizerNav.nav!.subtitle}
                </Text>
              ) : null}
              <Text style={styles.drillTitle} numberOfLines={1}>
                {organizerNav.nav!.title}
              </Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.titlePress, pressed && !isCalendar && styles.titlePressPressed]}
              onPress={goToCalendar}
              disabled={isCalendar}>
              <Text style={styles.title}>{defaultTitle}</Text>
            </Pressable>
          )}
        </View>

        {drillIn ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={organizerNav.nav!.onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to Organizer">
            <Text style={[styles.backGlyph, { color: accent }]}>‹</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.surface,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.border,
    overflow: 'hidden',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
  },
  logoFrame: {
    borderRadius: 13,
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 3,
    ...cardShadowSm,
  },
  logoFramePressed: {
    backgroundColor: Theme.primaryLight,
    borderColor: Theme.primaryLight,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: Theme.border,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titlePress: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginLeft: -6,
  },
  titlePressPressed: {
    backgroundColor: Theme.primaryLight,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 25,
    letterSpacing: -0.6,
    color: Theme.primaryDark,
    lineHeight: 29,
  },
  drillBlock: {
    gap: 3,
    paddingVertical: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  drillTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: Theme.text,
    lineHeight: 26,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  backBtnPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  backGlyph: {
    fontSize: 24,
    fontFamily: Fonts.semiBold,
    lineHeight: 26,
    marginTop: -2,
    marginLeft: -2,
  },
});
