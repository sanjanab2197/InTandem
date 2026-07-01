import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeConnectionCode } from '@/utils/coupleApi';

const PENDING_INVITE_KEY = '@together_pending_invite';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface PendingInvite {
  code: string;
  storedAt: string;
}

export async function storePendingInviteCode(code: string): Promise<void> {
  const payload: PendingInvite = {
    code: normalizeConnectionCode(code),
    storedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(payload));
}

export async function getPendingInviteCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingInvite;
    if (!parsed.code || !parsed.storedAt) return null;
    if (Date.now() - new Date(parsed.storedAt).getTime() > MAX_AGE_MS) {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    const legacyCode = normalizeConnectionCode(raw);
    if (legacyCode.length !== 8) {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      return null;
    }
    return legacyCode;
  }
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}
