import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '@/constants/Theme';

export default function AppHeaderBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isCalendar = pathname === '/' || pathname === '/index' || pathname.endsWith('/index');

  const goToCalendar = () => {
    if (!isCalendar) {
      router.push('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <Pressable
          style={({ pressed }) => [styles.brandBtn, pressed && styles.brandBtnPressed]}
          onPress={goToCalendar}
          accessibilityRole="button"
          accessibilityLabel="InTandem home, go to calendar">
          <View style={styles.iconHalo}>
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
            <View style={styles.brandUnderline} />
          </View>
        </Pressable>
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
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginLeft: -8,
  },
  brandBtnPressed: {
    backgroundColor: Theme.primaryLight,
  },
  iconHalo: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(139, 111, 212, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 212, 0.2)',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
  },
  brandText: {
    gap: 6,
  },
  brand: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    letterSpacing: -0.7,
    color: Theme.text,
    lineHeight: 30,
  },
  brandAccent: {
    color: Theme.primary,
  },
  brandUnderline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Theme.primary,
    opacity: 0.55,
  },
});
