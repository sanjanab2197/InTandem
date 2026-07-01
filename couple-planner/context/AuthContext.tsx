import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getSupabase } from '@/lib/supabase';
import { formatAuthError } from '@/utils/authErrors';
import { getPasswordResetRedirectUri } from '@/utils/authRecovery';
import { clearPendingInviteCode } from '@/utils/pendingInvite';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        return { error: error ? formatAuthError(error.message) : null };
      },
      signUp: async (email, password, displayName) => {
        const { data, error } = await getSupabase().auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
          },
        });
        if (error) return { error: formatAuthError(error.message), needsConfirmation: false };
        const needsConfirmation = !data.session;
        return { error: null, needsConfirmation };
      },
      requestPasswordReset: async (email) => {
        const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getPasswordResetRedirectUri(),
        });
        return { error: error ? formatAuthError(error.message) : null };
      },
      updatePassword: async (password) => {
        const { error } = await getSupabase().auth.updateUser({ password });
        return { error: error ? formatAuthError(error.message) : null };
      },
      signOut: async () => {
        await clearPendingInviteCode();
        await getSupabase().auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
