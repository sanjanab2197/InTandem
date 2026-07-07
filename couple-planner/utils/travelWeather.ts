import { addDays, format, parseISO } from 'date-fns';

export interface DailyWeatherLine {
  date: string;
  label: string;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
}

async function geocodeDestination(query: string): Promise<GeocodeResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { latitude: number; longitude: number; name: string; country?: string }[];
  };
  const hit = data.results?.[0];
  if (!hit) return null;
  return { latitude: hit.latitude, longitude: hit.longitude, name: hit.name };
}

/** Fetch daily high/low forecast from Open-Meteo (free, no API key). */
export async function fetchTripWeatherForecast(
  destination: string,
  startDate: string,
  days: number
): Promise<DailyWeatherLine[]> {
  const geo = await geocodeDestination(destination.split(',')[0].trim());
  if (!geo) return [];

  const start = parseISO(startDate);
  const end = addDays(start, Math.max(days - 1, 0));
  const params = new URLSearchParams({
    latitude: String(geo.latitude),
    longitude: String(geo.longitude),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode',
    timezone: 'auto',
    start_date: format(start, 'yyyy-MM-dd'),
    end_date: format(end, 'yyyy-MM-dd'),
    temperature_unit: 'fahrenheit',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };

  const times = data.daily?.time ?? [];
  return times.map((date, i) => {
    const hi = data.daily?.temperature_2m_max?.[i];
    const lo = data.daily?.temperature_2m_min?.[i];
    const rain = data.daily?.precipitation_probability_max?.[i];
    const hiF = hi != null ? Math.round(hi) : '?';
    const loF = lo != null ? Math.round(lo) : '?';
    const rainBit = rain != null && rain >= 25 ? ` · ${rain}% rain` : '';
    return {
      date,
      label: `${format(parseISO(date), 'EEE MMM d')} — ${loF}–${hiF}°F${rainBit}`,
    };
  });
}

export function weatherLinesForPrompt(lines: DailyWeatherLine[]): string {
  if (lines.length === 0) return '';
  return lines.map((l) => l.label).join('; ');
}
