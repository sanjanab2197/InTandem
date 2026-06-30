import { Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { useFonts as useSpaceMono } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import ReminderSync from '@/components/ReminderSync';
import AppDataSync from '@/components/AppDataSync';
import { Theme } from '@/constants/Theme';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CoupleProvider } from '@/context/CoupleContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const onAuthScreen = segments[0] === 'auth';
    const onInviteScreen = segments[0] === 'invite';
    const onResetPassword = segments[0] === 'reset-password';

    if (!session && !onAuthScreen && !onInviteScreen && !onResetPassword) {
      router.replace('/auth');
    } else if (session && onAuthScreen) {
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [interLoaded] = useFonts({
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [spaceLoaded, spaceError] = useSpaceMono({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const loaded = interLoaded && spaceLoaded;
  const error = spaceError;

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <CoupleProvider>
          <AppDataSync />
          <ReminderSync />
          <StatusBar style="dark" />
          <RootLayoutNav />
        </CoupleProvider>
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background,
  },
});
