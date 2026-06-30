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
import { isEmptyAppState, mergeAppStatePayload, pickNewerAppState } from '@/utils/appStateMerge';

const PUSH_DEBOUNCE_MS = 1500;

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

  const pullRemote = useCallback(async () => {
    if (!userId || pullingRef.current) return;
    pullingRef.current = true;

    try {
      const local = getAppStatePayload();
      const syncMeta = getSyncMeta();

      if (coupleId) {
        let remote = await fetchCoupleAppState(coupleId);
        if (!remote) {
          await upsertCoupleAppState(coupleId, userId, local);
          return;
        }

        const localChangedAfterRemote =
          new Date(syncMeta.lastLocalChangeAt).getTime() >
          new Date(remote.updatedAt ?? 0).getTime();

        if (localChangedAfterRemote && !isEmptyAppState(local)) {
          const merged = mergeAppStatePayload(local, remote);
          await upsertCoupleAppState(coupleId, userId, merged);
          skipNextPushRef.current = true;
          replaceAppStateFromRemote(merged);
          if (merged.updatedAt) setLastAppliedRemoteAt(merged.updatedAt);
          return;
        }

        const chosen = pickNewerAppState(local, remote);
        skipNextPushRef.current = true;
        replaceAppStateFromRemote(chosen);
        if (remote.updatedAt) setLastAppliedRemoteAt(remote.updatedAt);
        return;
      }

      let remote = await fetchUserAppState(userId);
      if (!remote) {
        if (!isEmptyAppState(local)) {
          await upsertUserAppState(userId, local);
        }
        return;
      }

      const localChangedAfterRemote =
        new Date(syncMeta.lastLocalChangeAt).getTime() >
        new Date(remote.updatedAt ?? 0).getTime();

      if (localChangedAfterRemote && !isEmptyAppState(local)) {
        const merged = mergeAppStatePayload(local, remote);
        await upsertUserAppState(userId, merged);
        skipNextPushRef.current = true;
        replaceAppStateFromRemote(merged);
        if (merged.updatedAt) setLastAppliedRemoteAt(merged.updatedAt);
        return;
      }

      const chosen = pickNewerAppState(local, remote);
      skipNextPushRef.current = true;
      replaceAppStateFromRemote(chosen);
      if (remote.updatedAt) setLastAppliedRemoteAt(remote.updatedAt);
    } catch {
      // Tables may not exist yet — local data still works.
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
    pushTimerRef.current = setTimeout(async () => {
      try {
        const payload = getAppStatePayload();
        if (coupleId) {
          await upsertCoupleAppState(coupleId, userId, payload);
        } else {
          await upsertUserAppState(userId, payload);
        }
      } catch {
        // Ignore — will retry on next change.
      }
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
    getAppStatePayload,
  ]);

  return null;
}
