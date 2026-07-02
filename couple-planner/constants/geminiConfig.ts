const DEFAULT_MODEL = 'gemini-flash-latest';

export function getGeminiApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  return key || null;
}

export function getGeminiModel(): string {
  return process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return !!getGeminiApiKey();
}
