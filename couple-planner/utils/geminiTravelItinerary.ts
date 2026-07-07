import { getGeminiApiKey } from '@/constants/geminiConfig';
import { callGeminiGenerateContent, parseGeminiJson } from '@/utils/geminiApi';
import { DailyWeatherLine, fetchTripWeatherForecast, weatherLinesForPrompt } from '@/utils/travelWeather';

export type TravelBudgetLevel = 'budget' | 'mid' | 'splurge';

export type TravelRadius = 'city' | 'day_trips' | 'regional' | 'road_trip';

export type DietaryPreference = 'none' | 'vegetarian' | 'vegan' | 'halal' | 'gluten_free';

export interface TravelItineraryRequest {
  destination: string;
  tripName: string;
  days: number;
  startDate?: string;
  travelRadius?: TravelRadius;
  dietaryPreference?: DietaryPreference;
  budgetLevel?: TravelBudgetLevel;
  foodPreferences?: string;
  nightlifePreferences?: string;
  generalPreferences?: string;
}

export interface TravelItineraryResult {
  summary: string;
  weather: string[];
  places: string[];
  dayTrips: string[];
  restaurants: string[];
  bars: string[];
  stays: string[];
  packing: string[];
  logistics: string[];
  budget: string[];
  tips: string[];
}

interface GeminiItineraryJson {
  summary?: string;
  weather?: string[];
  places?: string[];
  dayTrips?: string[];
  restaurants?: string[];
  bars?: string[];
  stays?: string[];
  packing?: string[];
  logistics?: string[];
  budget?: string[];
  tips?: string[];
}

const BUDGET_LABELS: Record<TravelBudgetLevel, string> = {
  budget: 'budget-friendly',
  mid: 'mid-range',
  splurge: 'splurge / special-occasion',
};

const RADIUS_LABELS: Record<TravelRadius, string> = {
  city: 'City only — walk/transit, no day trips outside the metro area',
  day_trips: 'Day trips up to ~1 hour drive each way (e.g. nearby parks, coast, small towns)',
  regional: 'Regional outings up to ~2 hours drive (e.g. Napa from SF, Multnomah Falls from Portland, wine country)',
  road_trip: 'Big outings 2+ hours if worth it — famous landmarks people actually travel for',
};

const DIETARY_LABELS: Record<DietaryPreference, string> = {
  none: 'No dietary restriction',
  vegetarian:
    'Vegetarian — prioritize TOP-RATED restaurants (Yelp/Google 4.5+ when known) with strong veg menus, not only veg-only spots. Include places where vegetarians have many choices.',
  vegan:
    'Vegan — top-rated vegan-friendly and vegan restaurants (4.5+ stars when known), plus omnivore spots with excellent plant-based options',
  halal: 'Halal — highly rated halal restaurants and halal-friendly options with ratings when known',
  gluten_free:
    'Gluten-free — well-reviewed restaurants with reliable GF options (note celiac-friendly when applicable)',
};

function buildPrompt(input: TravelItineraryRequest, weatherContext?: string): string {
  const budget = input.budgetLevel
    ? `\nBudget style: ${BUDGET_LABELS[input.budgetLevel]}`
    : '';
  const radius = input.travelRadius
    ? `\nHow far they'll travel from base: ${RADIUS_LABELS[input.travelRadius]}`
    : `\nHow far they'll travel: include popular day trips beyond downtown when typical for this destination`;
  const dietary =
    input.dietaryPreference && input.dietaryPreference !== 'none'
      ? `\nDietary needs: ${DIETARY_LABELS[input.dietaryPreference]}`
      : '';
  const food = input.foodPreferences?.trim()
    ? `\nAdditional food notes: ${input.foodPreferences.trim()}`
    : '';
  const nightlife = input.nightlifePreferences?.trim()
    ? `\nBars & nightlife preferences: ${input.nightlifePreferences.trim()}`
    : '';
  const general = input.generalPreferences?.trim()
    ? `\nOther trip preferences: ${input.generalPreferences.trim()}`
    : '';
  const dates = input.startDate
    ? `\nTrip start date: ${input.startDate} (${input.days} days)`
    : '';
  const weather = weatherContext
    ? `\nVerified weather forecast for the trip (use for packing & what to wear):\n${weatherContext}`
    : input.startDate
    ? `\nEstimate typical weather for ${input.startDate} and the following ${input.days - 1} days at ${input.destination}.`
    : '';

  const restaurantCount = Math.min(Math.max(input.days + 2, 5), 12);
  const barCount = Math.min(Math.max(Math.ceil(input.days / 2) + 1, 2), 6);
  const dayTripCount =
    input.travelRadius === 'city' ? 0 : input.travelRadius === 'day_trips' ? 2 : 4;
  const stayCount = 4;
  const packingCount = Math.min(6, input.days + 3);
  const tipCount = 4;
  const logisticsCount = 5;

  return `You are an expert travel planner for couples with deep local knowledge (Yelp, Google Reviews, travel guides). Create a complete ${input.days}-day trip plan for "${input.destination}".
Trip name: ${input.tripName}.${dates}${budget}${radius}${dietary}${food}${nightlife}${general}${weather}

Return ONLY valid JSON with this exact shape (no markdown):
{
  "summary": "One sentence overview",
  "weather": ["Brief forecast note if no live data", "Day-by-day or range summary"],
  "places": ["Day 1 — morning/afternoon/evening with neighborhoods AND landmarks beyond downtown only if radius allows"],
  "dayTrips": ["Popular outing — drive time, why it's famous, half/full day"],
  "restaurants": ["Name — neighborhood · 4.6/5 stars · cuisine · why top-rated + veg/diet fit"],
  "bars": ["Name — neighborhood · vibe · rating if known"],
  "stays": ["Neighborhood or hotel — price tier · why good base for this trip"],
  "packing": ["What to wear/bring based on forecast — keep to essentials"],
  "logistics": ["Transit, parking, passes, booking tips"],
  "budget": ["Hotels ~$X/night", "Daily food ~$X"],
  "tips": ["2-4 local customs or practical tips only"]
}

Rules:
- "places": exactly ${input.days} entries, each "Day N —". Mix neighborhoods — NOT only downtown/core. Include iconic sights people expect for this destination.
- "dayTrips": exactly ${dayTripCount} entries. ${dayTripCount === 0 ? 'Return empty array [].' : 'Famous regional spots people actually visit (e.g. Napa from SF, Multnomah Falls from Portland, Big Sur). Include drive time.'}
- "restaurants": ${restaurantCount} REAL well-known spots. Include Yelp/Google star rating when confident (e.g. 4.7/5). For vegetarians: mix dedicated veg gems AND highly-rated restaurants with extensive veg options.
- "bars": ${barCount} entries with ratings when known
- "stays": ${stayCount} where-to-stay options (neighborhoods + 1-2 specific hotels/lodging types) matched to budget
- "packing": ${packingCount} items max — weather-appropriate layers, footwear, essentials. No generic fluff.
- "logistics": ${logisticsCount} entries — getting around, airport/transit, day-trip driving, reservations
- "budget": 5-8 USD estimates aligned with budget style
- "tips": exactly ${tipCount} short tips — local etiquette, safety, timing. NOT duplicates of logistics.
- "weather": if live forecast provided above, summarize it; add 1 line on what to wear
- Keep each string under 180 characters
- Be specific, popular, and couple-friendly — research-quality recommendations`;
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

  let forecastLines: DailyWeatherLine[] = [];
  if (input.startDate) {
    try {
      forecastLines = await fetchTripWeatherForecast(destination, input.startDate, input.days);
    } catch {
      forecastLines = [];
    }
  }

  const weatherContext = weatherLinesForPrompt(forecastLines);

  const text = await callGeminiGenerateContent({
    prompt: buildPrompt({ ...input, destination, tripName }, weatherContext),
    json: true,
    temperature: 0.55,
  });

  let parsed: GeminiItineraryJson;
  try {
    parsed = parseItineraryJson(text);
  } catch {
    throw new Error('Could not read the AI response. Please try generating again.');
  }

  const weatherFromForecast =
    forecastLines.length > 0
      ? forecastLines.map((l) => l.label)
      : normalizeList(parsed.weather, 'Weather', 8);

  return {
    summary: parsed.summary?.trim() || `${input.days}-day trip to ${destination}`,
    weather: weatherFromForecast,
    places: normalizeList(parsed.places, 'Day'),
    dayTrips: normalizeList(parsed.dayTrips, 'Day trip'),
    restaurants: normalizeList(parsed.restaurants, 'Restaurant'),
    bars: normalizeList(parsed.bars, 'Bar'),
    stays: normalizeList(parsed.stays, 'Stay'),
    packing: normalizeList(parsed.packing, 'Packing', 8),
    logistics: normalizeList(parsed.logistics, 'Logistics'),
    budget: normalizeList(parsed.budget, 'Budget'),
    tips: normalizeList(parsed.tips, 'Tip', 5),
  };
}

type TravelPlanSubcategory =
  | 'places'
  | 'dining'
  | 'nightlife'
  | 'packing'
  | 'budget'
  | 'stays'
  | 'logistics';

export function itineraryToPlanInputs(
  result: TravelItineraryResult,
  tripName: string
): { subcategory: TravelPlanSubcategory; text: string }[] {
  const name = tripName.trim();
  const rows: { subcategory: TravelPlanSubcategory; text: string }[] = [];

  if (result.summary && name) {
    rows.push({ subcategory: 'places', text: result.summary });
  }

  for (const text of result.weather) {
    rows.push({ subcategory: 'packing', text: `Weather — ${text}` });
  }
  for (const text of result.places) rows.push({ subcategory: 'places', text });
  for (const text of result.dayTrips) {
    rows.push({ subcategory: 'places', text: `Day trip — ${text}` });
  }
  for (const text of result.restaurants) rows.push({ subcategory: 'dining', text });
  for (const text of result.bars) rows.push({ subcategory: 'nightlife', text });
  for (const text of result.stays) rows.push({ subcategory: 'stays', text });
  for (const text of result.packing) rows.push({ subcategory: 'packing', text });
  for (const text of result.logistics) rows.push({ subcategory: 'logistics', text });
  for (const text of result.budget) rows.push({ subcategory: 'budget', text });
  for (const text of result.tips) rows.push({ subcategory: 'budget', text: `Tip — ${text}` });

  return rows.map((row) => ({ ...row, text: row.text.slice(0, 220) }));
}

export const TRAVEL_RADIUS_OPTIONS: { key: TravelRadius; label: string; hint: string }[] = [
  { key: 'city', label: 'City only', hint: 'No car day trips' },
  { key: 'day_trips', label: '~1 hr out', hint: 'Nearby parks, coast' },
  { key: 'regional', label: '~2 hr out', hint: 'Napa, falls, wine country' },
  { key: 'road_trip', label: '2+ hr', hint: 'Must-see landmarks' },
];

export const DIETARY_OPTIONS: { key: DietaryPreference; label: string }[] = [
  { key: 'none', label: 'Any' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
  { key: 'gluten_free', label: 'Gluten-free' },
];
