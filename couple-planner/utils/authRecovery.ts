import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { getSupabase } from '@/lib/supabase';
import { formatAuthError } from '@/utils/authErrors';

export function getPasswordResetRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'intandem',
    path: 'reset-password',
  });
}

export async function createSessionFromRecoveryUrl(url: string | null): Promise<{ error: string | null }> {
  if (!url) return { error: null };

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    return { error: formatAuthError(String(errorCode)) };
  }

  const supabase = getSupabase();

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
    return { error: error ? formatAuthError(error.message) : null };
  }

  const accessToken = params.access_token;
  if (!accessToken) return { error: null };

  const { error } = await supabase.auth.setSession({
    access_token: String(accessToken),
    refresh_token: params.refresh_token ? String(params.refresh_token) : '',
  });

  return { error: error ? formatAuthError(error.message) : null };
}
