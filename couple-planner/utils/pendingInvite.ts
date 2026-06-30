import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeConnectionCode } from '@/utils/coupleApi';

const PENDING_INVITE_KEY = '@together_pending_invite';

export async function storePendingInviteCode(code: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, normalizeConnectionCode(code));
}

export async function getPendingInviteCode(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_INVITE_KEY);
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}
