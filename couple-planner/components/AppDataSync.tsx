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
    storageReady,
    events,
    planItems,
    expenses,
    planSubcategories,
    eventCategories,
    weeklyGoals,
    crossedOffDates,
    getAppStatePayload,
    replaceAppStateFromRemote,
    getSyncMeta,
    setLastAppliedRemoteAt,
    resetSyncScope,
    resetScopeLocalFields,
    setRemoteSyncReady,
  } = useApp();

  const coupleId = couple?.connected ? couple.coupleId : undefined;
  const userId = user?.id;
  const pullingRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPushRef = useRef(false);
  const pullCompletedRef = useRef(false);
  const lastPushErrorRef = useRef<string | null>(null);
  const lastPulledUserIdRef = useRef<string | undefined>(undefined);
  const lastPulledCoupleIdRef = useRef<string | null | undefined>(undefined);
  const getAppStatePayloadRef = useRef(getAppStatePayload);
  getAppStatePayloadRef.current = getAppStatePayload;

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
      const syncMeta = getSyncMeta();
      const currentCoupleId = coupleId ?? null;
      const scopeChanged =
        syncMeta.syncUserId !== userId || syncMeta.syncCoupleId !== currentCoupleId;

      if (scopeChanged) {
        resetSyncScope(userId, currentCoupleId);
        resetScopeLocalFields();
      }

      const local = getAppStatePayloadRef.current();
      const lastLocalChangeAt = scopeChanged
        ? new Date(0).toISOString()
        : syncMeta.lastLocalChangeAt;

      const markPullSuccess = () => {
        lastPulledUserIdRef.current = userId;
        lastPulledCoupleIdRef.current = currentCoupleId;
      };

      if (coupleId) {
        const remote = await fetchCoupleAppState(coupleId);
        const resolved = resolveAppStateOnPull(
          local,
          remote,
          lastLocalChangeAt,
          scopeChanged
        );

        if (resolved.action === 'upsert') {
          if (!isEmptyAppState(resolved.payload) || !remote) {
            await upsertCoupleAppState(coupleId, userId, resolved.payload);
          }
          skipNextPushRef.current = true;
          replaceAppStateFromRemote(resolved.payload);
          setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
          markPullSuccess();
          return;
        }

        skipNextPushRef.current = true;
        replaceAppStateFromRemote(resolved.payload);
        setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
        markPullSuccess();
        return;
      }

      const remote = await fetchUserAppState(userId);
      const resolved = resolveAppStateOnPull(
        local,
        remote,
        lastLocalChangeAt,
        scopeChanged
      );

      if (resolved.action === 'upsert') {
        if (!isEmptyAppState(resolved.payload) || !remote) {
          await upsertUserAppState(userId, resolved.payload);
        }
        skipNextPushRef.current = true;
        replaceAppStateFromRemote(resolved.payload);
        setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
        markPullSuccess();
        return;
      }

      skipNextPushRef.current = true;
      replaceAppStateFromRemote(resolved.payload);
      setLastAppliedRemoteAt(resolved.payload.updatedAt ?? new Date().toISOString());
      markPullSuccess();
    } catch (error) {
      logSyncError('Pull failed — run supabase/app_state.sql in Supabase if tables are missing', error);
    } finally {
      pullingRef.current = false;
    }
  }, [
    coupleId,
    userId,
    getSyncMeta,
    replaceAppStateFromRemote,
    setLastAppliedRemoteAt,
    resetSyncScope,
    resetScopeLocalFields,
  ]);

  useEffect(() => {
    pullCompletedRef.current = false;
    skipNextPushRef.current = true;
    setRemoteSyncReady(false);
  }, [userId, coupleId, setRemoteSyncReady]);

  useEffect(() => {
    if (!storageReady || !userId) return;

    pullRemote().finally(() => {
      pullCompletedRef.current = true;
      setRemoteSyncReady(true);
    });
  }, [storageReady, userId, coupleId, pullRemote, setRemoteSyncReady]);

  useEffect(() => {
    if (!storageReady || !userId || !pullCompletedRef.current) return;
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
    storageReady,
    userId,
    coupleId,
    events,
    planItems,
    expenses,
    planSubcategories,
    eventCategories,
    weeklyGoals,
    crossedOffDates,
    pushToRemote,
  ]);

  return null;
}
