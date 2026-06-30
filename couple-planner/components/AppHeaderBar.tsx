import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '@/constants/Theme';

function getTabLabel(pathname: string): string {
  if (pathname.includes('plans')) return 'Planner';
  if (pathname.includes('stats')) return 'Stats';
  if (pathname.includes('profile')) return 'Profile';
  return 'Schedule';
}

export default function AppHeaderBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isCalendar = pathname === '/' || pathname === '/index' || pathname.endsWith('/index');
  const tabLabel = getTabLabel(pathname);

  const goToCalendar = () => {
    if (!isCalendar) {
      router.push('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.brandBtn, pressed && styles.brandBtnPressed]}
          onPress={goToCalendar}
          accessibilityRole="button"
          accessibilityLabel="InTandem home, go to calendar">
          <View style={styles.iconWrap}>
            <Image
              source={require('@/assets/images/intandem-icon.png')}
              style={styles.icon}
              resizeMode="cover"
            />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brand}>
              In<Text style={styles.brandAccent}>Tandem</Text>
            </Text>
          </View>
        </Pressable>

        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{tabLabel}</Text>
        </View>
      </View>

      <View style={styles.bottomRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FDFBFF',
    paddingBottom: 0,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
    shadowColor: Theme.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    gap: 12,
  },
  brandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    borderRadius: 16,
    paddingVertical: 4,
    paddingRight: 8,
    marginLeft: -4,
  },
  brandBtnPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2D6F5',
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandText: {
    flex: 1,
  },
  brand: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.6,
    color: Theme.text,
    lineHeight: 28,
  },
  brandAccent: {
    color: Theme.primary,
  },
  tabBadge: {
    backgroundColor: Theme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2D6F5',
  },
  tabBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Theme.primaryDark,
    letterSpacing: 0.2,
  },
  bottomRule: {
    height: 3,
    marginHorizontal: -20,
    backgroundColor: Theme.primary,
    opacity: 0.35,
  },
});
