import { Linking, Share } from 'react-native';
import { User } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { CoupleConnection } from '@/types';

function mapCoupleRow(raw: Record<string, unknown>, fallbackCode = ''): CoupleConnection {
  return {
    connected: Boolean(raw.connected),
    coupleId: typeof raw.couple_id === 'string' ? raw.couple_id : undefined,
    mySlot: raw.my_slot === 1 || raw.my_slot === 2 ? raw.my_slot : null,
    myDisplayName:
      typeof raw.my_display_name === 'string' && raw.my_display_name.trim()
        ? raw.my_display_name
        : 'You',
    myConnectionCode:
      typeof raw.my_connection_code === 'string' && raw.my_connection_code
        ? raw.my_connection_code
        : fallbackCode,
    partner1Name:
      typeof raw.partner1_name === 'string' && raw.partner1_name.trim()
        ? raw.partner1_name
        : 'Partner 1',
    partner2Name:
      typeof raw.partner2_name === 'string' && raw.partner2_name.trim()
        ? raw.partner2_name
        : 'Partner 2',
    partnerEmail: typeof raw.partner_email === 'string' ? raw.partner_email : null,
    anniversary: typeof raw.anniversary === 'string' ? raw.anniversary : null,
    bio: typeof raw.bio === 'string' ? raw.bio : null,
    pendingInviteEmail:
      typeof raw.pending_invite_email === 'string' ? raw.pending_invite_email : null,
  };
}

function fallbackCouple(displayName: string, code: string): CoupleConnection {
  return {
    connected: false,
    myDisplayName: displayName,
    myConnectionCode: code,
    partner1Name: displayName || 'Partner 1',
    partner2Name: 'Partner 2',
  };
}

export function normalizeConnectionCode(code: string): string {
  return code.replace(/\D/g, '').slice(0, 8);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError?.message?.includes('schema cache') || fetchError?.message?.includes('profiles')) {
    throw new Error(
      'Database not set up yet. In Supabase Dashboard → SQL Editor, run supabase/setup_all.sql, then tap Retry.'
    );
  }
  if (fetchError?.message?.includes('infinite recursion')) {
    throw new Error(
      'Database policy error. In Supabase SQL Editor, run supabase/fix_rls_recursion.sql, then tap Retry.'
    );
  }
  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    const { error } = await supabase.from('profiles').update({ email: user.email }).eq('id', user.id);
    if (error) throw new Error(error.message);
    return;
  }

  const displayName =
    (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()) ||
    user.email?.split('@')[0] ||
    'You';

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    display_name: displayName,
  });
  if (error) throw new Error(error.message);
}

export async function ensureMyConnectionCode(): Promise<string> {
  const { data, error } = await getSupabase().rpc('ensure_my_connection_code');
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Could not create your connection code');
  return String(data);
}

export async function fetchMyCouple(user: User): Promise<CoupleConnection> {
  await ensureUserProfile(user);

  let myCode = '';
  try {
    myCode = await ensureMyConnectionCode();
  } catch {
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('connection_code, display_name')
      .eq('id', user.id)
      .maybeSingle();

    myCode = profile?.connection_code ?? '';
    if (!myCode) {
      throw new Error(
        'Database not set up yet. In Supabase Dashboard → SQL Editor, run supabase/setup_all.sql, then tap Retry.'
      );
    }
  }

  const { data, error } = await getSupabase().rpc('get_my_couple');
  if (!error && data && typeof data === 'object') {
    return mapCoupleRow(data as Record<string, unknown>, myCode);
  }

  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  return fallbackCouple(profile?.display_name ?? 'You', myCode);
}

export async function connectWithPartnerCode(code: string): Promise<void> {
  const normalized = normalizeConnectionCode(code);
  if (normalized.length !== 8) {
    throw new Error('Enter a valid 8-digit code');
  }

  const { error } = await getSupabase().rpc('connect_with_partner_code', {
    p_code: normalized,
  });
  if (error) throw new Error(error.message);
}

export async function disconnectPartner(): Promise<void> {
  const { error } = await getSupabase().rpc('disconnect_partner');
  if (error) {
    if (error.message.includes('disconnect_partner') || error.code === 'PGRST202') {
      throw new Error(
        'Remove partner is not set up yet. Run supabase/disconnect_partner.sql in Supabase SQL Editor, then try again.'
      );
    }
    throw new Error(error.message);
  }
}

export async function updateMyDisplayName(displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('Name cannot be empty');

  const supabase = getSupabase();
  const { error: rpcError } = await supabase.rpc('update_my_display_name', {
    p_display_name: trimmed,
  });

  if (rpcError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id);
    if (error) throw new Error(error.message);
  }

  await supabase.auth.updateUser({ data: { display_name: trimmed } });
}

export async function updateCoupleDetails(anniversary?: string, bio?: string): Promise<void> {
  const { error } = await getSupabase().rpc('update_couple_details', {
    p_anniversary: anniversary ?? null,
    p_bio: bio ?? null,
  });
  if (error) throw new Error(error.message);
}

export function buildInviteLink(code: string): string {
  return `intandem://invite/${normalizeConnectionCode(code)}`;
}

export async function sendInviteViaEmail(
  toEmail: string,
  code: string,
  fromName: string
): Promise<void> {
  const subject = 'Join me on InTandem';
  const body = [
    'Hi!',
    '',
    "I'd love to connect with you on InTandem — our shared planner app.",
    '',
    `My connection code is: ${code}`,
    '',
    'To connect:',
    '1. Sign up or sign in to InTandem',
    '2. Open Profile',
    '3. Enter my code under "Partner\'s code" and tap Connect',
    '',
    `— ${fromName}`,
  ].join('\n');

  const mailto = `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const supported = await Linking.canOpenURL(mailto);
    if (supported) {
      await Linking.openURL(mailto);
      return;
    }
  } catch {
    // fall through to share
  }

  await Share.share({ message: `${subject}\n\n${body}` });
}
