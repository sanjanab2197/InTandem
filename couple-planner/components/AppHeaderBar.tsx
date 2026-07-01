import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';

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
  const title = getHeaderTitle(pathname);

  const isCalendar = pathname === '/' || pathname === '/index' || pathname.endsWith('/index');

  const goToCalendar = () => {
    if (!isCalendar) {
      router.push('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Pressable
        style={({ pressed }) => [styles.inner, pressed && !isCalendar && styles.innerPressed]}
        onPress={goToCalendar}
        disabled={isCalendar}
        accessibilityRole="button"
        accessibilityLabel={isCalendar ? title : `${title}, go to Schedule`}>
        <Image
          source={require('@/assets/images/intandem-icon.png')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={styles.title}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.surface,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingVertical: 4,
    paddingRight: 8,
    marginLeft: -4,
  },
  innerPressed: {
    backgroundColor: Theme.primaryLight,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: Theme.primaryDark,
    lineHeight: 30,
  },
});
