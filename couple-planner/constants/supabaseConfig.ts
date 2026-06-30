import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabasePublishableKey?: string }
  | undefined;

export function getSupabaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    extra?.supabaseUrl ??
    'https://ctbsdkvcaeqxxpicirjc.supabase.co'
  );
}

export function getSupabasePublishableKey(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    extra?.supabasePublishableKey ??
    'sb_publishable_uqYQHS0NduZzyy7Gxkx1pw_kee0V9-k'
  );
}
