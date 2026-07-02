import { getGeminiApiKey, getGeminiModel } from '@/constants/geminiConfig';

export interface GeminiGenerateOptions {
  prompt: string;
  json?: boolean;
  temperature?: number;
}

export async function callGeminiGenerateContent(options: GeminiGenerateOptions): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Gemini API key missing. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file (free at aistudio.google.com).'
    );
  }

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: options.prompt }] }],
      ...(options.json
        ? {
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: options.temperature ?? 0.7,
            },
          }
        : {
            generationConfig: {
              temperature: options.temperature ?? 0.7,
            },
          }),
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const message =
      body?.error?.message ??
      `Gemini request failed (${response.status}). Check your API key and daily quota.`;
    throw new Error(message);
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response. Try again in a moment.');
  }

  return text;
}

export function parseGeminiJson<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(payload) as T;
}
