import { getGeminiApiKey } from '@/constants/geminiConfig';
import { callGeminiGenerateContent, parseGeminiJson } from '@/utils/geminiApi';

export interface MealFromGroceriesResult {
  mealName: string;
  summary: string;
  ingredientsUsed: string[];
  missingOptional: string[];
  steps: string[];
  timeMinutes: number;
  servings: number;
}

interface GeminiMealJson {
  mealName?: string;
  summary?: string;
  ingredientsUsed?: string[];
  missingOptional?: string[];
  steps?: string[];
  timeMinutes?: number;
  servings?: number;
}

function buildPrompt(groceries: string[], preferences?: string): string {
  const list = groceries.map((g) => `- ${g}`).join('\n');
  const prefs = preferences?.trim()
    ? `\nPreferences: ${preferences.trim()}`
    : '';

  return `You are a home cook helping a couple plan dinner from their grocery list.

Groceries on hand:
${list}${prefs}

Suggest ONE realistic meal they can make using MOST of these ingredients.

Return ONLY valid JSON (no markdown):
{
  "mealName": "Short appetizing name",
  "summary": "One sentence describing the dish",
  "ingredientsUsed": ["items from the list actually used"],
  "missingOptional": ["nice-to-have extras not on the list, max 3"],
  "steps": ["Step 1...", "Step 2...", "Step 3..."],
  "timeMinutes": 30,
  "servings": 2
}

Rules:
- Use at least 3 items from the grocery list
- 4-6 clear cooking steps
- timeMinutes between 10 and 90
- servings 2 unless preferences say otherwise
- Keep steps under 100 characters each`;
}

function parseMealJson(text: string): GeminiMealJson {
  return parseGeminiJson<GeminiMealJson>(text);
}

function normalizeStrings(values: unknown, max = 12): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean).slice(0, max);
}

export async function generateMealFromGroceries(
  groceries: string[],
  preferences?: string
): Promise<MealFromGroceriesResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Gemini API key missing. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file (free at aistudio.google.com).'
    );
  }

  const items = groceries.map((g) => g.trim()).filter(Boolean);
  if (items.length < 2) {
    throw new Error('Add at least 2 grocery items to your checklist first.');
  }

  const text = await callGeminiGenerateContent({
    prompt: buildPrompt(items, preferences),
    json: true,
    temperature: 0.7,
  });

  let parsed: GeminiMealJson;
  try {
    parsed = parseMealJson(text);
  } catch {
    throw new Error('Could not read the AI response. Please try again.');
  }

  const steps = normalizeStrings(parsed.steps, 8);
  if (steps.length === 0) {
    throw new Error('The AI did not return cooking steps. Try generating again.');
  }

  return {
    mealName: parsed.mealName?.trim() || 'Suggested meal',
    summary: parsed.summary?.trim() || 'A meal made from your groceries.',
    ingredientsUsed: normalizeStrings(parsed.ingredientsUsed, 12),
    missingOptional: normalizeStrings(parsed.missingOptional, 4),
    steps,
    timeMinutes: Math.min(120, Math.max(10, Number(parsed.timeMinutes) || 30)),
    servings: Math.min(8, Math.max(1, Number(parsed.servings) || 2)),
  };
}

export function mealResultToPlanText(result: MealFromGroceriesResult): string {
  const header = `🍳 ${result.mealName} · ${result.timeMinutes} min · serves ${result.servings}`;
  const used =
    result.ingredientsUsed.length > 0
      ? `\nUses: ${result.ingredientsUsed.join(', ')}`
      : '';
  const steps = result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return `${header}\n${result.summary}${used}\n\n${steps}`.slice(0, 500);
}

export function mealResultToPlanInputs(result: MealFromGroceriesResult) {
  return [
    {
      text: mealResultToPlanText(result),
      subcategory: 'meals',
      tags: ['ai-generated'],
    },
  ];
}
