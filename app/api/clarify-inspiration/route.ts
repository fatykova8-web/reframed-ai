import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import type { InspirationDirection, ReferenceType } from '@/lib/types';

export const runtime = 'nodejs';

const requestSchema = z.object({
  inspiration: z.string().min(1)
});

const REFERENCE_TYPES: ReferenceType[] = [
  'designer',
  'celebrity/musician',
  'movie/tv',
  'event',
  'food/drink',
  'place/travel',
  'aesthetic',
  'historical era',
  'vague/unknown'
];

const BLOCKED_UNGROUNDED_REFERENCES = [
  'wes anderson',
  'indie sleaze',
  'random colorful storytelling',
  'generic artsy styling'
];

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY.' }, { status: 500 });
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inspiration.' }, { status: 400 });
  }

  const { inspiration } = parsed.data;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
The user entered this fashion inspiration:

"${inspiration}"

First classify the input as exactly one referenceType:
${REFERENCE_TYPES.map((type) => `- ${type}`).join('\n')}

Then interpret it into up to 4 meaningfully different styling directions before outfit generation.

This product is a fashion taste-building tool, not a generic outfit generator.
Help the user choose what they actually mean by the reference.

Critical grounding rules:
- Every direction must come directly from "${inspiration}".
- Do not introduce a different aesthetic, designer, film, artist, trend, or cultural reference unless it is literally part of the user's inspiration.
- The title, interpretation, stylingCodes, wearableTranslation, and tension must all be traceable to the original inspiration.
- If the inspiration is sensory, food, travel, place, mood, or color-based, translate those sensory cues into fashion. Do not substitute an unrelated fashion-history reference.
- For "limoncello spritz", good directions would stay around Italian summer aperitivo, citrus brightness, coastal ease, glassware sparkle, breezy linen, sun-warmed color, and playful vacation polish. Bad directions would mention Indie Sleaze, Wes Anderson, generic artsy styling, or unrelated runway references.
- If fewer than 3 strong directions exist, return fewer directions. Never invent weak directions to reach a fixed count.

Reference type guidance:
- food/drink: translate into place, mood, palette, texture, social ritual, and atmosphere.
- designer: explain design language, iconic codes, collections, silhouettes, and recurring details.
- celebrity/musician: identify iconic eras, public image, styling signatures, or defining looks.
- movie/tv: identify characters, wardrobe codes, color world, setting, and visual language.
- event: interpret social context, practicality, expected style codes, and occasion boundaries.
- place/travel: translate climate, architecture, local style, palette, texture, and pace.
- aesthetic: define the actual visual codes and avoid unrelated neighboring aesthetics.
- historical era: identify silhouettes, materials, formality, and modern wearable translation.
- vague/unknown: be conservative and only offer directions supported by the words the user gave.

Each direction must:
- identify a distinct interpretation of the reference
- explain the visual codes a stylist would borrow
- translate those codes into wearable styling
- name the creative tension, such as surreal vs polished or costume vs everyday
- include whyThisFits explaining why the direction is directly grounded in the original reference
- include scores from 0-10:
  - groundingScore: direct traceability to "${inspiration}"
  - culturalAccuracyScore: accuracy for the classified reference type
  - fashionTranslationScore: usefulness for wearable styling

Example:
For "Jean Paul Gaultier 2000":
{
  "referenceType": "designer",
  "directions": [
    {
      "title": "Nautical Pop Codes",
      "referenceType": "designer",
      "interpretation": "Sailor stripes, crisp contrast, and playful French marine styling.",
      "stylingCodes": ["Breton stripe", "navy and white", "structured collar", "red accent"],
      "wearableTranslation": "Use one crisp stripe or sailor detail with clean everyday separates.",
      "tension": "Playful without looking like a costume.",
      "whyThisFits": "Gaultier repeatedly used sailor stripes and nautical styling as recognizable house codes.",
      "scores": {
        "groundingScore": 10,
        "culturalAccuracyScore": 9,
        "fashionTranslationScore": 9
      }
    }
  ]
}

For "limoncello spritz":
- referenceType must be "food/drink".
- Good direction titles include "Italian Coastal Aperitivo", "Amalfi Summer Brightness", "Mediterranean Resort Ease", "Citrus White Contrast".
- Bad direction titles include "Wes Anderson", "Indie Sleaze", and "Colorful Storytelling".

Return ONLY valid JSON:
{
  "referenceType": "one allowed referenceType",
  "directions": [
    {
      "title": "2-5 word direction name",
      "referenceType": "same referenceType",
      "interpretation": "one sentence interpreting this reference angle",
      "stylingCodes": ["3-5 concise visual or styling codes"],
      "wearableTranslation": "one sentence translating it into wearable fashion",
      "tension": "one sentence describing what to balance",
      "whyThisFits": "one sentence explaining direct grounding in the original reference",
      "scores": {
        "groundingScore": 0,
        "culturalAccuracyScore": 0,
        "fashionTranslationScore": 0
      }
    }
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]
    });

    const result = safeJsonParse<{
      referenceType: ReferenceType;
      directions: InspirationDirection[];
    }>(
      response.choices[0]?.message?.content || '{}',
      { referenceType: 'vague/unknown', directions: [] }
    );

    const referenceType = REFERENCE_TYPES.includes(result.referenceType)
      ? result.referenceType
      : 'vague/unknown';

    const directions = result.directions
      .filter((direction) => {
        const searchableText = [
          direction.title,
          direction.interpretation,
          direction.stylingCodes?.join(' '),
          direction.wearableTranslation,
          direction.tension,
          direction.whyThisFits
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const includesBlockedReference = BLOCKED_UNGROUNDED_REFERENCES.some((term) =>
          searchableText.includes(term)
        );

        return Boolean(direction.whyThisFits)
          && typeof direction.scores?.groundingScore === 'number'
          && typeof direction.scores?.culturalAccuracyScore === 'number'
          && typeof direction.scores?.fashionTranslationScore === 'number'
          && direction.scores.groundingScore >= 8
          && !includesBlockedReference;
      })
      .slice(0, 4)
      .map((direction) => ({
        ...direction,
        referenceType: direction.referenceType || referenceType
      }));

    return NextResponse.json({ referenceType, directions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not clarify inspiration.' },
      { status: 500 }
    );
  }
}
