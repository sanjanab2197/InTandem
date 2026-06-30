import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Theme } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { connectWithPartnerCode } from '@/utils/coupleApi';
import { storePendingInviteCode } from '@/utils/pendingInvite';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !code) return;

    const inviteCode = String(code).replace(/\D/g, '').slice(0, 8);

    (async () => {
      if (!session) {
        await storePendingInviteCode(inviteCode);
        router.replace(`/auth?invite=${inviteCode}`);
        return;
      }

      try {
        await connectWithPartnerCode(inviteCode);
        router.replace('/profile');
      } catch {
        router.replace('/profile');
      }
    })();
  }, [authLoading, session, code, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background,
  },
});
