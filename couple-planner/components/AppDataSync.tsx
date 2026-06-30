import { useCallback, useEffect, useRef } from 'react';

import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  fetchCoupleAppState,
  fetchUserAppState,
  upsertCoupleAppState,
  upsertUserAppState,
} from '@/utils/appStateApi';
import { isEmptyAppState, resolveAppStateOnPull } from '@/utils/appStateMerge';

const PUSH_DEBOUNCE_MS = 800;

function logSyncError(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[AppDataSync] ${label}:`, message);
}

export default function AppDataSync() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const {
    loading,
    events,
    planItems,
    expenses,
    planSubcategories,
    eventCategories,
    weeklyGoals,
    getAppStatePayload,
    replaceAppStateFromRemote,
    getSyncMeta,
    setLastAppliedRemoteAt,
  } = useApp();

  const coupleId = couple?.connected ? couple.coupleId : undefined;
  const userId = user?.id;
  const pullingRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPushRef = useRef(false);
  const lastPushErrorRef = useRef<string | null>(null);

  const pushToRemote = useCallback(async () => {
    if (!userId) return;

    const payload = getAppStatePayload();
    try {
      if (coupleId) {
        await upsertCoupleAppState(coupleId, userId, payload);
      } else {
        await upsertUserAppState(userId, payload);
      }
      lastPushErrorRef.current = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (lastPushErrorRef.current !== message) {
        lastPushErrorRef.current = message;
        logSyncError('Push failed', error);
      }
      throw error;
    }
  }, [coupleId, userId, getAppStatePayload]);

  const pullRemote = useCallback(async () => {
    if (!userId || pullingRef.current) return;
    pullingRef.current = true;

    try {
      const local = getAppStatePayload();
      const syncMeta = getSyncMeta();

      if (coupleId) {
        const remote = await fetchCoupleAppState(coupleId);
        const resolved = resolveAppStateOnPull(local, remote, syncMeta.lastLocalChangeAt);

        if (resolved.action === 'upsert') {
          if (!isEmptyAppState(resolved.payload) || !remote) {
            await upsertCoupleAppState(coupleId, userId, resolved.payload);
          }
          skipNextPushRef.current = true;
          replaceAppStateFromRemote(resolved.payload);
          setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
          return;
        }

        skipNextPushRef.current = true;
        replaceAppStateFromRemote(resolved.payload);
        setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
        return;
      }

      const remote = await fetchUserAppState(userId);
      const resolved = resolveAppStateOnPull(local, remote, syncMeta.lastLocalChangeAt);

      if (resolved.action === 'upsert') {
        if (!isEmptyAppState(resolved.payload) || !remote) {
          await upsertUserAppState(userId, resolved.payload);
        }
        skipNextPushRef.current = true;
        replaceAppStateFromRemote(resolved.payload);
        setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
        return;
      }

      skipNextPushRef.current = true;
      replaceAppStateFromRemote(resolved.payload);
      setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
    } catch (error) {
      logSyncError('Pull failed — run supabase/app_state.sql in Supabase if tables are missing', error);
    } finally {
      pullingRef.current = false;
    }
  }, [
    coupleId,
    userId,
    getAppStatePayload,
    getSyncMeta,
    replaceAppStateFromRemote,
    setLastAppliedRemoteAt,
  ]);

  useEffect(() => {
    if (loading || !userId) return;
    pullRemote();
  }, [loading, userId, coupleId, pullRemote]);

  useEffect(() => {
    if (loading || !userId) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushToRemote().catch(() => {
        // Logged in pushToRemote; retry on next change.
      });
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    loading,
    userId,
    coupleId,
    events,
    planItems,
    expenses,
    planSubcategories,
    eventCategories,
    weeklyGoals,
    pushToRemote,
  ]);

  return null;
}
