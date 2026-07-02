import AsyncStorage from '@react-native-async-storage/async-storage';

export type AiAgentKind = 'travel' | 'meal';

const DAILY_LIMITS: Record<AiAgentKind, number> = {
  travel: 5,
  meal: 5,
};

function storageKey(kind: AiAgentKind): string {
  return `@ai_agent_daily_usage:${kind}:${new Date().toISOString().slice(0, 10)}`;
}

export async function getAiAgentRemainingToday(kind: AiAgentKind): Promise<number> {
  const limit = DAILY_LIMITS[kind];
  const raw = await AsyncStorage.getItem(storageKey(kind));
  const used = raw ? Number.parseInt(raw, 10) : 0;
  if (Number.isNaN(used)) return limit;
  return Math.max(0, limit - used);
}

export async function consumeAiAgentRequest(
  kind: AiAgentKind
): Promise<{ ok: true; remaining: number } | { ok: false; remaining: 0 }> {
  const limit = DAILY_LIMITS[kind];
  const remaining = await getAiAgentRemainingToday(kind);
  if (remaining <= 0) {
    return { ok: false, remaining: 0 };
  }
  const used = limit - remaining + 1;
  await AsyncStorage.setItem(storageKey(kind), String(used));
  return { ok: true, remaining: remaining - 1 };
}

export function getAiAgentDailyLimit(kind: AiAgentKind): number {
  return DAILY_LIMITS[kind];
}

/** @deprecated use getAiAgentDailyLimit('travel') */
export const AI_AGENT_DAILY_LIMIT = DAILY_LIMITS.travel;
