import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '@/constants/Theme';
import BrandMark from '@/components/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { createSessionFromRecoveryUrl } from '@/utils/authRecovery';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updatePassword, session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async (url: string | null) => {
      const result = await createSessionFromRecoveryUrl(url);
      if (!mounted) return;
      if (result.error) setError(result.error);
      setReady(true);
    };

    Linking.getInitialURL().then((url) => bootstrap(url));

    const sub = Linking.addEventListener('url', ({ url }) => {
      bootstrap(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (ready && session) return;
    if (ready && !session && !error) {
      setError('This reset link expired or is invalid. Request a new one from the login screen.');
    }
  }, [ready, session, error]);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) {
      setError(updateError);
      return;
    }

    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <BrandMark compact subtitle={"Pick something fresh — you're almost back in."} />

        {!ready ? (
          <ActivityIndicator size="large" color={Theme.primary} style={styles.loader} />
        ) : (
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardTitle}>Choose a new password</Text>
            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={Theme.textSecondary}
                secureTextEntry
                textContentType="newPassword"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Type it again"
                placeholderTextColor={Theme.textSecondary}
                secureTextEntry
                textContentType="newPassword"
              />
            </View>

            {error ? (
              <View style={styles.alertError}>
                <Text style={styles.alertErrorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !session}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Update password</Text>
              )}
            </Pressable>

            <Pressable style={styles.backLink} onPress={() => router.replace('/auth')}>
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Theme.primaryLight,
    opacity: 0.85,
  },
  blobBottom: {
    position: 'absolute',
    bottom: 40,
    left: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Theme.accent,
    opacity: 0.35,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  loader: { marginTop: 40 },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: Theme.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Theme.primary,
  },
  cardTitle: {
    marginTop: 16,
    marginBottom: 12,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Theme.text,
  },
  field: { marginTop: 14 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1.5,
    borderColor: Theme.border,
    fontFamily: 'Inter_600SemiBold',
  },
  alertError: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FDEEEE',
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  alertErrorText: { color: '#A93226', fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: Theme.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: Theme.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.75 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  backLink: { marginTop: 18, alignItems: 'center' },
  backLinkText: { fontSize: 14, fontWeight: '600', color: Theme.primary, fontFamily: 'Inter_600SemiBold' },
});
