import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CoupleConnection } from '@/types';
import {
  connectWithPartnerCode,
  disconnectPartner,
  fetchMyCouple,
  updateCoupleDetails,
  updateMyDisplayName,
} from '@/utils/coupleApi';
import { syncAppStateAfterCoupleConnect } from '@/utils/appStateApi';
import { clearPendingInviteCode, getPendingInviteCode } from '@/utils/pendingInvite';

interface CoupleContextValue {
  couple: CoupleConnection | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  joinWithCode: (code: string) => Promise<void>;
  saveDisplayName: (name: string) => Promise<void>;
  saveCoupleDetails: (anniversary?: string, bio?: string) => Promise<void>;
  removePartner: () => Promise<void>;
}

const CoupleContext = createContext<CoupleContextValue | null>(null);

function applyDisplayNameToCouple(prev: CoupleConnection, name: string): CoupleConnection {
  const next = { ...prev, myDisplayName: name };
  if (prev.mySlot === 2) {
    next.partner2Name = name;
  } else {
    next.partner1Name = name;
  }
  return next;
}

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { updateProfile } = useApp();
  const [couple, setCouple] = useState<CoupleConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncLocalProfile = useCallback(
    (next: CoupleConnection) => {
      updateProfile({
        partner1Name: next.partner1Name,
        partner2Name: next.partner2Name,
        anniversary: next.anniversary ?? undefined,
        bio: next.bio ?? undefined,
      });
    },
    [updateProfile]
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setCouple(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyCouple(user);
      setCouple(data);
      syncLocalProfile(data);
    } catch (e) {
      setCouple(null);
      setError(e instanceof Error ? e.message : 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [user, syncLocalProfile]);

  useEffect(() => {
    if (!user) {
      setCouple(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const pending = await getPendingInviteCode();
        if (pending) {
          try {
            await connectWithPartnerCode(pending);
            await clearPendingInviteCode();
            const connected = await fetchMyCouple(user);
            if (connected.connected && connected.coupleId) {
              await syncAppStateAfterCoupleConnect(user.id, connected.coupleId);
            }
          } catch {
            // user can retry manually on profile
          }
        }

        if (!cancelled) {
          await refresh();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  const value = useMemo<CoupleContextValue>(
    () => ({
      couple,
      loading,
      error,
      refresh,
      joinWithCode: async (code) => {
        await connectWithPartnerCode(code);
        await clearPendingInviteCode();
        await refresh();
        const data = await fetchMyCouple(user!);
        if (data.connected && data.coupleId && user) {
          await syncAppStateAfterCoupleConnect(user.id, data.coupleId);
        }
      },
      saveDisplayName: async (name) => {
        await updateMyDisplayName(name);
        setCouple((prev) => {
          if (!prev) return prev;
          const next = applyDisplayNameToCouple(prev, name.trim());
          syncLocalProfile(next);
          return next;
        });
        await refresh();
      },
      saveCoupleDetails: async (anniversary, bio) => {
        await updateCoupleDetails(anniversary, bio);
        await refresh();
      },
      removePartner: async () => {
        const myName = couple?.myDisplayName ?? 'Partner 1';
        await disconnectPartner();
        updateProfile({
          partner1Name: myName,
          partner2Name: 'Partner 2',
          anniversary: undefined,
          bio: undefined,
        });
        await refresh();
      },
    }),
    [couple, loading, error, refresh, updateProfile, syncLocalProfile, user]
  );

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCouple() {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used within CoupleProvider');
  return ctx;
}

export { sendInviteViaEmail } from '@/utils/coupleApi';
