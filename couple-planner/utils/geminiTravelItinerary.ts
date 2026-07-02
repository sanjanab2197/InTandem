import { getGeminiApiKey } from '@/constants/geminiConfig';
import { callGeminiGenerateContent, parseGeminiJson } from '@/utils/geminiApi';

export type TravelBudgetLevel = 'budget' | 'mid' | 'splurge';

export interface TravelItineraryRequest {
  destination: string;
  tripName: string;
  days: number;
  budgetLevel?: TravelBudgetLevel;
  foodPreferences?: string;
  nightlifePreferences?: string;
  generalPreferences?: string;
}

export interface TravelItineraryResult {
  summary: string;
  places: string[];
  restaurants: string[];
  bars: string[];
  packing: string[];
  budget: string[];
  tips: string[];
}

interface GeminiItineraryJson {
  summary?: string;
  places?: string[];
  restaurants?: string[];
  bars?: string[];
  packing?: string[];
  budget?: string[];
  tips?: string[];
}

const BUDGET_LABELS: Record<TravelBudgetLevel, string> = {
  budget: 'budget-friendly',
  mid: 'mid-range',
  splurge: 'splurge / special-occasion',
};

function buildPrompt(input: TravelItineraryRequest): string {
  const budget = input.budgetLevel
    ? `\nBudget style: ${BUDGET_LABELS[input.budgetLevel]}`
    : '';
  const food = input.foodPreferences?.trim()
    ? `\nFood & restaurant preferences: ${input.foodPreferences.trim()}`
    : '';
  const nightlife = input.nightlifePreferences?.trim()
    ? `\nBars & nightlife preferences: ${input.nightlifePreferences.trim()}`
    : '';
  const general = input.generalPreferences?.trim()
    ? `\nOther trip preferences: ${input.generalPreferences.trim()}`
    : '';

  const restaurantCount = Math.min(Math.max(input.days + 1, 4), 10);
  const barCount = Math.min(Math.max(Math.ceil(input.days / 2) + 1, 2), 6);
  const packingCount = Math.min(input.days + 8, 18);

  return `You are an expert travel planner for couples. Create a complete ${input.days}-day trip plan for "${input.destination}".
Trip name: ${input.tripName}.${budget}${food}${nightlife}${general}

Return ONLY valid JSON with this exact shape (no markdown):
{
  "summary": "One sentence overview of the trip vibe",
  "places": ["Day 1 — morning/afternoon/evening plan", "Day 2 — ..."],
  "restaurants": ["Restaurant Name — cuisine, neighborhood, why it fits"],
  "bars": ["Bar Name — vibe, neighborhood, best for"],
  "packing": ["item — brief note if helpful"],
  "budget": ["Hotels ~$X/night", "Daily food ~$X"],
  "tips": ["practical tip for this destination"]
}

Rules:
- "places" must have exactly ${input.days} entries, each starting with "Day N —"
- Each day plan should cover morning, afternoon, and evening with specific neighborhoods or sights
- "restaurants" must have ${restaurantCount} real or realistic recommendations tailored to food preferences
- "bars" must have ${barCount} bar/cocktail/wine spots tailored to nightlife preferences (use cozy wine bars if they prefer quiet evenings)
- "packing" must have ${packingCount} practical items including weather-appropriate clothing, toiletries, and trip-specific essentials
- "budget" should list 5-8 rough USD estimates aligned with the budget style
- "tips" should list 4-6 logistics tips (transit passes, reservations, safety, local customs)
- Keep each string under 140 characters
- Be specific, actionable, and couple-friendly`;
}

function parseItineraryJson(text: string): GeminiItineraryJson {
  return parseGeminiJson<GeminiItineraryJson>(text);
}

function normalizeList(values: unknown, fallbackPrefix: string, max = 24): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, max)
    .map((v, i) => (v.length > 0 ? v : `${fallbackPrefix} ${i + 1}`));
}

export async function generateTravelItinerary(
  input: TravelItineraryRequest
): Promise<TravelItineraryResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Gemini API key missing. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file (free at aistudio.google.com).'
    );
  }

  const destination = input.destination.trim();
  const tripName = input.tripName.trim() || destination;
  if (!destination) {
    throw new Error('Enter a destination to plan your trip.');
  }
  if (input.days < 1 || input.days > 21) {
    throw new Error('Trip length must be between 1 and 21 days.');
  }

  const text = await callGeminiGenerateContent({
    prompt: buildPrompt({ ...input, destination, tripName }),
    json: true,
    temperature: 0.65,
  });

  let parsed: GeminiItineraryJson;
  try {
    parsed = parseItineraryJson(text);
  } catch {
    throw new Error('Could not read the AI response. Please try generating again.');
  }

  return {
    summary: parsed.summary?.trim() || `${input.days}-day trip to ${destination}`,
    places: normalizeList(parsed.places, 'Day'),
    restaurants: normalizeList(parsed.restaurants, 'Restaurant'),
    bars: normalizeList(parsed.bars, 'Bar'),
    packing: normalizeList(parsed.packing, 'Packing item'),
    budget: normalizeList(parsed.budget, 'Budget item'),
    tips: normalizeList(parsed.tips, 'Tip'),
  };
}

type TravelPlanSubcategory = 'places' | 'dining' | 'nightlife' | 'packing' | 'budget';

export function itineraryToPlanInputs(
  result: TravelItineraryResult,
  tripName: string
): { subcategory: TravelPlanSubcategory; text: string }[] {
  const name = tripName.trim();
  const rows: { subcategory: TravelPlanSubcategory; text: string }[] = [];

  if (result.summary && name) {
    rows.push({ subcategory: 'places', text: result.summary });
  }

  for (const text of result.places) rows.push({ subcategory: 'places', text });
  for (const text of result.restaurants) rows.push({ subcategory: 'dining', text });
  for (const text of result.bars) rows.push({ subcategory: 'nightlife', text });
  for (const text of result.packing) rows.push({ subcategory: 'packing', text });
  for (const text of result.budget) rows.push({ subcategory: 'budget', text });
  for (const text of result.tips) rows.push({ subcategory: 'budget', text: `Tip — ${text}` });

  return rows.map((row) => ({ ...row, text: row.text.slice(0, 200) }));
}
