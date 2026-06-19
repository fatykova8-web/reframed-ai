import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import type { Recommendation } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const requestSchema = z.object({
  analysis: z.any(),
  occasion: z.string().min(1),
  feeling: z.string().min(1),
  inspiration: z.string().optional().default(''),
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

async function generateMoodboardImage(prompt: string): Promise<string | null> {
  if (process.env.GENERATE_MOODBOARD_IMAGES !== 'true') return null;

  try {
    const imageResponse = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt: `${prompt}. Do not include a human model. Do not include text. Single square image. Clean fashion moodboard, high quality lighting.`,
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
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY.' },
      { status: 500 }
    );
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { analysis, occasion, feeling, inspiration, originalLook, feedback } = parsed.data;

  const prompt = `
You are Reframed, a fashion recommendation refinement engine.

The user wants to refine ONE existing look, not generate all looks again.

User-confirmed item:
${JSON.stringify(analysis, null, 2)}

Occasion:
${occasion}

Desired feeling:
${feeling}

User inspiration:
${inspiration || 'No specific inspiration provided'}

Original look:
${JSON.stringify(originalLook, null, 2)}

User feedback:
${feedback}

Regenerate the look using the feedback.

Rules:
- Keep the same expression level/type as the original look: ${originalLook.type}.
- Keep the uploaded clothing item as the hero piece.
- Do not create a generic outfit.
- If feedback is "Too basic", make the look more fashion-forward and less predictable.
- If feedback is "Not wearable", simplify the proportions and make it realistic without becoming boring.
- If feedback is "More artistic", increase art/fashion-history influence and add stronger styling intelligence.
- If feedback is "More reference", make the user's inspiration more visible and explain the connection.
- If feedback is "More colorful", add intentional color styling and avoid random color chaos.
- If feedback is "Less costume-like", make the reference subtler, more modern, and more wearable.
- Avoid ankle boots with short skirts/dresses unless tights or tonal styling create a continuous leg line.
- Visual prompt must include every key item mentioned in pairings.
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

    const result = safeJsonParse<{
      recommendation?: Omit<Recommendation, 'id' | 'moodboardImage'>;
    }>(response.choices[0]?.message?.content || '{}', {});

    if (!result.recommendation) {
      return NextResponse.json(
        { error: 'No refined recommendation returned.' },
        { status: 500 }
      );
    }

    const moodboardImage = await generateMoodboardImage(result.recommendation.visualPrompt);

    return NextResponse.json({
      recommendation: {
        ...result.recommendation,
        moodboardImage
      }
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error?.message || 'Could not refine look.' },
      { status: 500 }
    );
  }
}
