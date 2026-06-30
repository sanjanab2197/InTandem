import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import BrandMark from '@/components/BrandMark';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { storePendingInviteCode } from '@/utils/pendingInvite';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

/** Purple-first accents that stay on-brand */
const AUTH_THEME = {
  signUp: {
    blobTop: Theme.primaryLight,
    blobMid: Theme.love.roseLight,
    blobBottom: '#F0EBFA',
    cardBg: '#FDFBFF',
    cardBorder: '#E2D6F5',
    accentBar: [Theme.primary, Theme.secondary, Theme.love.rose] as const,
    btn: Theme.primaryDark,
    btnShadow: Theme.primaryDark,
    inputTints: [Theme.secondary, Theme.primary, Theme.love.rose] as const,
    switchBg: Theme.love.roseLight,
    switchBorder: '#EDD4E0',
    switchLink: Theme.love.roseDark,
    forgotLink: Theme.primary,
  },
  signIn: {
    blobTop: '#EAE6F5',
    blobMid: Theme.primaryLight,
    blobBottom: Theme.love.roseLight,
    cardBg: Theme.surface,
    cardBorder: Theme.border,
    accentBar: [Theme.primaryDark, Theme.primary, Theme.secondary] as const,
    btn: Theme.primary,
    btnShadow: Theme.primaryDark,
    inputTints: [Theme.primary, Theme.secondary] as const,
    switchBg: Theme.primaryLight,
    switchBorder: Theme.border,
    switchLink: Theme.love.roseDark,
    forgotLink: '#7A9E99',
  },
  forgot: {
    blobTop: '#F5F0E8',
    blobMid: Theme.primaryLight,
    blobBottom: '#E8F0EF',
    cardBg: Theme.surface,
    cardBorder: Theme.border,
    accentBar: [Theme.secondary, Theme.primary] as const,
    btn: Theme.primary,
    btnShadow: Theme.primaryDark,
    inputTints: [Theme.primary] as const,
    switchBg: Theme.surface,
    switchBorder: Theme.border,
    switchLink: Theme.primaryDark,
    forgotLink: Theme.primaryDark,
  },
} as const;

const MODE_COPY: Record<AuthMode, { title: string; desc: string }> = {
  signIn: { title: 'Welcome back', desc: 'Sign in to pick up where you left off' },
  signUp: { title: 'Join InTandem', desc: 'Start planning life together in minutes' },
  forgotPassword: { title: 'Reset password', desc: 'We\'ll send a link to your email' },
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { invite: inviteParam } = useLocalSearchParams<{ invite?: string }>();
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const inviteCode = useMemo(() => {
    if (!inviteParam) return '';
    return String(inviteParam).replace(/\D/g, '').slice(0, 8);
  }, [inviteParam]);

  useEffect(() => {
    if (inviteCode) {
      storePendingInviteCode(inviteCode);
    }
  }, [inviteCode]);

  const resetFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    resetFeedback();
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter the email for your account.');
      return;
    }

    setSubmitting(true);
    resetFeedback();

    const { error: resetError } = await requestPasswordReset(trimmedEmail);
    if (resetError) {
      setError(resetError);
    } else {
      setMessage('Check your inbox for a reset link. It may take a minute — check spam too.');
    }

    setSubmitting(false);
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signUp' && !trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    resetFeedback();

    if (mode === 'signIn') {
      const { error: signInError } = await signIn(trimmedEmail, password);
      if (signInError) setError(signInError);
    } else {
      const { error: signUpError, needsConfirmation } = await signUp(
        trimmedEmail,
        password,
        trimmedName
      );
      if (signUpError) {
        setError(signUpError);
      } else if (needsConfirmation) {
        setMessage(
          inviteCode
            ? 'Check your email to confirm your account, then sign in. Your invite will connect you automatically.'
            : 'Check your email to confirm your account, then sign in.'
        );
        setMode('signIn');
      } else {
        setMessage(
          inviteCode
            ? 'Account created. Connecting you with your partner...'
            : 'Account created. You are signed in.'
        );
      }
    }

    setSubmitting(false);
  };

  const isSignUp = mode === 'signUp';
  const isForgot = mode === 'forgotPassword';
  const copy = MODE_COPY[mode];

  const headerSubtitle = inviteCode
    ? 'Your partner is waiting — let\'s get you in'
    : null;

  const primaryLabel = isForgot
    ? 'Send reset link'
    : isSignUp
      ? 'Create account'
      : 'Sign in';

  const theme = isSignUp ? AUTH_THEME.signUp : isForgot ? AUTH_THEME.forgot : AUTH_THEME.signIn;

  const inputFields = isSignUp
    ? (['name', 'email', 'password'] as const)
    : isForgot
      ? (['email'] as const)
      : (['email', 'password'] as const);

  const inputTint = (field: (typeof inputFields)[number]) => {
    const idx = inputFields.indexOf(field);
    return theme.inputTints[Math.max(0, idx)] ?? theme.inputTints[0];
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.bgLayer}>
        <View style={[styles.blobTop, { backgroundColor: theme.blobTop }]} />
        <View style={[styles.blobMid, { backgroundColor: theme.blobMid }]} />
        <View style={[styles.blobBottom, { backgroundColor: theme.blobBottom }]} />
        <View style={styles.bgWash} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BrandMark
          tagline={!isForgot ? 'Your love story, beautifully coordinated.' : null}
          subtitle={headerSubtitle}
        />

        {inviteCode ? (
          <View style={styles.inviteBanner}>
            <View style={styles.inviteHeader}>
              <Text style={styles.inviteEmoji}>💜</Text>
              <Text style={styles.inviteBannerTitle}>Partner invite</Text>
            </View>
            <Text style={styles.inviteBannerCode}>{inviteCode}</Text>
            <Text style={styles.inviteBannerHint}>
              Sign in or sign up — you&apos;ll connect automatically after joining.
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.cardAccentRow}>
            {theme.accentBar.map((color) => (
              <View key={color} style={[styles.cardAccentSlice, { backgroundColor: color }]} />
            ))}
          </View>

          {isForgot ? (
            <Pressable style={styles.backInline} onPress={() => switchMode('signIn')}>
              <Text style={styles.backInlineText}>← Back to sign in</Text>
            </Pressable>
          ) : null}

          <Text style={styles.cardTitle}>{copy.title}</Text>
          <Text style={styles.cardDesc}>{copy.desc}</Text>

          {isSignUp ? (
            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={[styles.input, { borderLeftColor: inputTint('name') }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How your partner sees you"
                placeholderTextColor={Theme.textSecondary}
                autoCapitalize="words"
                textContentType="name"
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, { borderLeftColor: inputTint('email') }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          {!isForgot ? (
            <View style={styles.field}>
              <View style={styles.passwordRow}>
                <Text style={styles.label}>Password</Text>
                {mode === 'signIn' ? (
                  <Pressable onPress={() => switchMode('forgotPassword')} hitSlop={8}>
                    <Text style={[styles.forgotLink, { color: theme.forgotLink }]}>
                      Forgot password?
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                style={[styles.input, { borderLeftColor: inputTint('password') }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={Theme.textSecondary}
                secureTextEntry
                textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
              />
            </View>
          ) : null}

          {isForgot ? (
            <Text style={styles.hint}>
              Enter the email on your account. We&apos;ll send a link to choose a new password.
            </Text>
          ) : null}

          {!inviteCode && isSignUp ? (
            <Text style={styles.hint}>
              Connect with your partner anytime from Profile — no code needed here.
            </Text>
          ) : null}

          {error ? (
            <View style={styles.alertError}>
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          ) : null}
          {message ? (
            <View style={styles.alertSuccess}>
              <Text style={styles.alertSuccessText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.btn, shadowColor: theme.btnShadow },
              submitting && styles.primaryBtnDisabled,
            ]}
            onPress={isForgot ? handleForgotPassword : handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            )}
          </Pressable>
        </View>

        {!isForgot ? (
          <View
            style={[
              styles.switchPill,
              { backgroundColor: theme.switchBg, borderColor: theme.switchBorder },
            ]}>
            <Text style={styles.switchText}>
              {mode === 'signIn' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Pressable onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
              <Text style={[styles.switchLink, { color: theme.switchLink }]}>
                {mode === 'signIn' ? 'Sign up' : 'Sign in'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  bgLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  bgWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 248, 255, 0.4)',
  },
  blobTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.75,
  },
  blobMid: {
    position: 'absolute',
    top: '32%',
    left: -140,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.3,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.45,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  inviteBanner: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  inviteEmoji: { fontSize: 16 },
  inviteBannerTitle: { fontSize: 13, fontWeight: '700', color: Theme.primaryDark, fontFamily: 'Inter_600SemiBold' },
  inviteBannerCode: {
    fontSize: 26,
    fontWeight: '800',
    color: Theme.primary,
    letterSpacing: 3,
    fontFamily: 'Inter_700Bold',
  },
  inviteBannerHint: { fontSize: 13, color: Theme.textSecondary, marginTop: 8, lineHeight: 19 },
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
  cardAccentRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    flexDirection: 'row',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  cardAccentSlice: { flex: 1, height: 4 },
  backInline: { marginTop: 12, marginBottom: 4, alignSelf: 'flex-start' },
  backInlineText: { fontSize: 14, fontWeight: '600', color: Theme.primary, fontFamily: 'Inter_600SemiBold' },
  cardTitle: {
    marginTop: 16,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  cardDesc: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
    color: Theme.textSecondary,
    lineHeight: 20,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  forgotLink: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  input: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1.5,
    borderColor: Theme.border,
    borderLeftWidth: 3,
    fontFamily: 'Inter_600SemiBold',
  },
  hint: {
    marginTop: 14,
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 19,
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
  alertSuccess: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Theme.primaryLight,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  alertSuccessText: { color: Theme.primaryDark, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
  primaryBtn: {
    marginTop: 22,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.75 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
  switchPill: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  switchText: { fontSize: 14, color: Theme.textSecondary, fontFamily: 'Inter_600SemiBold' },
  switchLink: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
