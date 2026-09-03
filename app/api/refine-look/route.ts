import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { garmentDnaLockText, garmentDnaText } from '@/lib/garmentDna';
import { stylingContextPromptText } from '@/lib/stylingContext';
import type { ItemAnalysis, Recommendation, StylingContext } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  analysis: z.any(),
  occasion: z.string().min(1),
  stylingContext: z
    .object({
      rawText: z.string().default(''),
      occasion: z.string().default(''),
      city: z.string().optional(),
      timing: z.string().default('unspecified timing'),
      season: z.string().default('unspecified season'),
      weatherSummary: z.string().default(''),
      practicalityNotes: z.array(z.string()).default([]),
      isWeatherLive: z.boolean().default(false)
    })
    .optional(),
  feeling: z.string().min(1),
  inspiration: z.string().optional().default(''),
  inspirationDirection: z
    .object({
      title: z.string(),
      referenceType: z
        .enum([
          'designer',
          'celebrity/musician',
          'movie/tv',
          'event',
          'food/drink',
          'place/travel',
          'aesthetic',
          'historical era',
          'vague/unknown'
        ])
        .optional(),
      interpretation: z.string(),
      stylingCodes: z.array(z.string()).default([]),
      wearableTranslation: z.string(),
      tension: z.string(),
      whyThisFits: z.string(),
      scores: z
        .object({
          groundingScore: z.number(),
          culturalAccuracyScore: z.number(),
          fashionTranslationScore: z.number()
        })
        .optional()
    })
    .nullable()
    .optional(),
  originalLook: z.any(),
  feedback: z.string().min(1)
});

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function garmentDescriptor(analysis: ItemAnalysis) {
  return garmentDnaText(analysis);
}

async function generateMoodboardImage(prompt: string, analysis: ItemAnalysis): Promise<string | null> {
  if (process.env.GENERATE_MOODBOARD_IMAGES !== 'true') return null;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageResponse = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt: `${prompt}. The central hero object must be the uploaded garment with this exact Garment DNA: ${garmentDescriptor(analysis)}. ${garmentDnaLockText(analysis)} Include that garment clearly and completely in the flat lay, then arrange supporting wardrobe pieces around it. Do not include a human model. Do not include text. Single square image. Clean fashion moodboard, high quality lighting.`,
      size: '1024x1024'
    });

    const first = imageResponse.data?.[0] as any;
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
    if (first?.url) return first.url;
    return null;
  } catch (error) {
    console.error('Moodboard image generation failed:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  console.info('[refine-look-debug] Request received', {
    requestId,
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length')
  });

  if (!process.env.OPENAI_API_KEY) {
    console.error('[refine-look-debug] Missing OpenAI API key', { requestId });
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY.' },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch (error: any) {
    console.error('[refine-look-debug] Failed to parse request JSON', {
      requestId,
      error: error?.message || error
    });

    return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[refine-look-debug] Invalid request payload', {
      requestId,
      issues: parsed.error.flatten()
    });
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const {
    analysis,
    occasion,
    stylingContext,
    feeling,
    inspiration,
    inspirationDirection,
    originalLook,
    feedback
  } = parsed.data;

  const prompt = `
You are Reframed, a fashion recommendation refinement engine.

The user wants to refine ONE existing look, not generate all looks again.

User-confirmed item:
${JSON.stringify(analysis, null, 2)}

Garment DNA lock:
${garmentDnaLockText(analysis)}

Occasion:
${occasion}

Detected wearing context:
${stylingContextPromptText(stylingContext as StylingContext | undefined)}

Desired feeling:
${feeling}

User inspiration:
${inspiration || 'No specific inspiration provided'}

Chosen reference interpretation:
${inspirationDirection ? JSON.stringify(inspirationDirection, null, 2) : 'None selected'}

Original look:
${JSON.stringify(originalLook, null, 2)}

User feedback:
${feedback}

Regenerate the look using the feedback.

Rules:
- Keep the same expression level/type as the original look: ${originalLook.type}.
- Keep the uploaded clothing item as the hero piece.
- Keep the uploaded garment DNA immutable: ${garmentDescriptor(analysis)}.
- Preserve the chosen reference interpretation unless the feedback directly asks for less reference.
- Do not create a generic outfit.
- If feedback is "Too basic", make the look more fashion-forward and less predictable.
- If feedback is "Not wearable", simplify the proportions and make it realistic without becoming boring.
- If feedback is "Not wearable", specifically improve practicality for the detected city/place, season, timing, and likely weather needs.
- If feedback is "More artistic", increase art/fashion-history influence and add stronger styling intelligence.
- If feedback is "More reference", make the user's inspiration more visible and explain the connection.
- If feedback is "More colorful", add intentional color styling and avoid random color chaos.
- If feedback is "Less costume-like", make the reference subtler, more modern, and more wearable.
- Avoid ankle boots with short skirts/dresses unless tights or tonal styling create a continuous leg line.
- Visual prompt must explicitly name the uploaded garment DNA: ${garmentDescriptor(analysis)}.
- Visual prompt must include this exact sentence: "Keep the uploaded garment unchanged: same color, same shape, same style, same size/proportions, same sleeve length, same length, same pattern, same material. Do not crop, shorten, recolor, restyle, or transform the garment."
- Visual prompt must include the uploaded garment as the central moodboard item and include every key item mentioned in pairings.
- Do not suggest buying new items.
- Do not repeat the original look unless the feedback is already fully satisfied.

Return ONLY valid JSON:
{
  "recommendation": {
    "type": "${originalLook.type}",
    "title": "short title",
    "rationale": "one sentence",
    "reference": "specific reference",
    "unexpectedMove": "one specific styling move",
    "pairings": ["pairing 1", "pairing 2", "pairing 3", "pairing 4"],
    "explanation": "2-3 sentences",
    "visualPrompt": "flat-lay fashion moodboard prompt that includes the uploaded item and every pairing"
  }
}
`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.info('[refine-look-debug] Sending OpenAI refinement request', {
      requestId,
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      lookId: originalLook?.id,
      feedback
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a fashion refinement engine. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.info('[refine-look-debug] OpenAI refinement response received', {
      requestId,
      responseId: response.id,
      model: response.model,
      finishReason: response.choices[0]?.finish_reason
    });

    const result = safeJsonParse<{
      recommendation?: Omit<Recommendation, 'id' | 'moodboardImage'>;
    }>(response.choices[0]?.message?.content || '{}', {});

    if (!result.recommendation) {
      console.error('[refine-look-debug] No refined recommendation returned', {
        requestId
      });

      return NextResponse.json(
        { error: 'No refined recommendation returned.' },
        { status: 500 }
      );
    }

    const moodboardImage = await generateMoodboardImage(
      result.recommendation.visualPrompt,
      analysis
    );

    console.info('[refine-look-debug] Returning JSON response', {
      requestId,
      status: 200,
      hasMoodboardImage: Boolean(moodboardImage)
    });

    return NextResponse.json({
      recommendation: {
        ...result.recommendation,
        moodboardImage
      }
    });
  } catch (error: any) {
    console.error('[refine-look-debug] Request failed', {
      requestId,
      status: error?.status,
      message: error?.message,
      errorBody: error?.error || error?.response?.data || error
    });

    return NextResponse.json(
      { error: error?.message || 'Could not refine look.' },
      { status: error?.status || 500 }
    );
  }
}
