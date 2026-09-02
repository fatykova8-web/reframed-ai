import type { StylingContext } from './types';

const OCCASION_KEYWORDS = [
  'work',
  'office',
  'networking',
  'date',
  'concert',
  'dinner',
  'brunch',
  'vacation',
  'weekend',
  'party',
  'wedding',
  'gallery',
  'school',
  'travel'
];

const CITY_CLIMATE: Record<string, { hemisphere: 'north' | 'south'; climate: string }> = {
  toronto: { hemisphere: 'north', climate: 'continental city weather with cold winters and warm summers' },
  'new york': { hemisphere: 'north', climate: 'four-season city weather' },
  london: { hemisphere: 'north', climate: 'mild, often damp city weather' },
  paris: { hemisphere: 'north', climate: 'temperate city weather with polished seasonal dressing' },
  milan: { hemisphere: 'north', climate: 'northern Italian city weather with warm summers and cool winters' },
  miami: { hemisphere: 'north', climate: 'hot, humid, subtropical weather' },
  'los angeles': { hemisphere: 'north', climate: 'mild warm weather with cooler evenings' },
  chicago: { hemisphere: 'north', climate: 'windy four-season city weather' },
  montreal: { hemisphere: 'north', climate: 'cold winters and warm humid summers' },
  vancouver: { hemisphere: 'north', climate: 'mild, rainy coastal weather' },
  sydney: { hemisphere: 'south', climate: 'southern hemisphere coastal weather' },
  melbourne: { hemisphere: 'south', climate: 'changeable southern hemisphere city weather' },
  buenosaires: { hemisphere: 'south', climate: 'southern hemisphere temperate city weather' },
  'buenos aires': { hemisphere: 'south', climate: 'southern hemisphere temperate city weather' }
};

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function titleCase(text: string) {
  return text
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function detectOccasion(text: string) {
  const lower = text.toLowerCase();
  const match = OCCASION_KEYWORDS.find((keyword) => lower.includes(keyword));

  if (!match) {
    if (lower.includes('no plan') || lower.includes('ideas') || lower.includes('inspiration')) {
      return 'Just exploring';
    }

    return text ? 'Flexible plan' : '';
  }

  if (match === 'office') return 'Work';
  if (match === 'gallery') return 'Gallery or creative event';
  return titleCase(match);
}

function detectTiming(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes('tonight')) return 'tonight';
  if (lower.includes('today')) return 'today';
  if (lower.includes('tomorrow')) return 'tomorrow';
  if (lower.includes('this weekend')) return 'this weekend';
  if (lower.includes('this week')) return 'this week';
  if (lower.includes('no plan') || lower.includes('ideas') || lower.includes('inspiration')) {
    return 'just exploring';
  }

  return 'unspecified timing';
}

function detectCity(text: string) {
  const lower = text.toLowerCase();
  const knownCity = Object.keys(CITY_CLIMATE).find((city) => lower.includes(city));

  if (knownCity) return titleCase(knownCity);

  const match = lower.match(/\b(?:in|for|at)\s+([a-z][a-z\s.-]{1,28})(?:\s+(?:today|tonight|tomorrow|this|next)\b|$)/);
  if (!match?.[1]) return undefined;

  const city = match[1]
    .replace(/\b(work|office|dinner|brunch|date|party|weekend|vacation|concert|gallery)\b/g, '')
    .trim();

  return city ? titleCase(city) : undefined;
}

function seasonForMonth(month: number, hemisphere: 'north' | 'south') {
  const northSeason =
    month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';

  if (hemisphere === 'north') return northSeason;

  if (northSeason === 'winter') return 'summer';
  if (northSeason === 'spring') return 'fall';
  if (northSeason === 'summer') return 'winter';
  return 'spring';
}

function inferWeatherSummary({
  city,
  season,
  timing
}: {
  city?: string;
  season: string;
  timing: string;
}) {
  const lowerCity = city?.toLowerCase();
  const cityClimate = lowerCity ? CITY_CLIMATE[lowerCity] : undefined;

  if (cityClimate?.climate.includes('hot, humid')) {
    return `${season}; likely warm or humid, so prioritize breathable layers and shoes that can handle heat.`;
  }

  if (cityClimate?.climate.includes('rainy') || cityClimate?.climate.includes('damp')) {
    return `${season}; likely mild or damp, so consider a layer and weather-tolerant shoes.`;
  }

  if (timing === 'tonight') {
    return `${season}; evening styling should allow for cooler temperature or an indoor-outdoor transition.`;
  }

  if (cityClimate) {
    return `${season}; inferred from ${city}'s typical ${cityClimate.climate}.`;
  }

  return `${season}; inferred from the current date because no specific city weather is available.`;
}

function practicalityNotes(season: string, timing: string, city?: string) {
  const notes = ['Keep the outfit realistic for the stated occasion.'];

  if (timing === 'tonight') notes.push('Include an evening-appropriate layer or shoe choice.');
  if (season === 'winter') notes.push('Account for warmth, coverage, and outerwear compatibility.');
  if (season === 'summer') notes.push('Use breathable fabrics and avoid heavy layering.');
  if (season === 'fall' || season === 'spring') notes.push('Use transitional layers and weather-flexible shoes.');
  if (city) notes.push(`Respect the likely climate and city context for ${city}.`);

  return notes;
}

export function buildStylingContext(rawText: string, date = new Date()): StylingContext {
  const raw = normalizeText(rawText);
  const city = detectCity(raw);
  const cityClimate = city ? CITY_CLIMATE[city.toLowerCase()] : undefined;
  const timing = detectTiming(raw);
  const season = seasonForMonth(date.getMonth(), cityClimate?.hemisphere || 'north');

  return {
    rawText: raw,
    occasion: detectOccasion(raw),
    city,
    timing,
    season,
    weatherSummary: inferWeatherSummary({ city, season, timing }),
    practicalityNotes: practicalityNotes(season, timing, city),
    isWeatherLive: false
  };
}

export function stylingContextPromptText(context?: StylingContext | null) {
  if (!context) return 'No structured wearing context was inferred.';

  return [
    `Raw user context: ${context.rawText || 'not provided'}`,
    `Occasion: ${context.occasion || 'not specified'}`,
    `City/place: ${context.city || 'not specified'}`,
    `Timing: ${context.timing}`,
    `Season: ${context.season}`,
    `Weather/season note: ${context.weatherSummary}`,
    `Live weather: ${context.isWeatherLive ? 'yes' : 'no, inferred from date/city only'}`,
    `Practicality notes: ${context.practicalityNotes.join('; ')}`
  ].join('\n');
}
