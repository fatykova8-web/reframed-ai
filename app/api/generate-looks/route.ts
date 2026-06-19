import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { recommendationPrompt } from '@/lib/prompts';
import type { ItemAnalysis, Recommendation } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const itemAnalysisSchema = z.object({
  isSingleItem: z.boolean().default(true),
  error: z.string().optional(),
  category: z.string().min(1),
  color: z.string().min(1),
  material: z.string().min(1),
  pattern: z.string().default('unknown'),
  fitOrSilhouette: z.string().optional(),
  formality: z.string().optional(),
  confidence: z.number().default(1),
  notes: z.string().optional()
});

const requestSchema = z.object({
  analysis: itemAnalysisSchema,
  occasion: z.string().min(1),
  feeling: z.string().min(1),
  inspiration: z.string().optional().default('')
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

async function createRecommendations(
  analysis: ItemAnalysis,
  occasion: string,
  feeling: string,
  inspiration: string
): Promise<Recommendation[]> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are Reframed, a fashion recommendation engine. Return only valid JSON.'
      },
      {
        role: 'user',
        content: recommendationPrompt(
          analysis,
          occasion as any,
          feeling as any,
          inspiration as any
        )
      }
    ]
  });

  const parsed = safeJsonParse<{
    recommendations: Omit<Recommendation, 'id' | 'moodboardImage'>[];
  }>(response.choices[0]?.message?.content || '{}', { recommendations: [] });

  return parsed.recommendations.slice(0, 3).map((rec, index) => ({
    id: `look-${Date.now()}-${index}`,
    moodboardImage: null,
    ...rec
  }));
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
      { error: 'Missing OPENAI_API_KEY. Add it to .env.local and restart npm run dev.' },
      { status: 500 }
    );
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { analysis, occasion, feeling, inspiration } = parsed.data;

  try {
    const recommendations = await createRecommendations(
      analysis,
      occasion,
      feeling,
      inspiration
    );

    const withImages = await Promise.all(
      recommendations.map(async (rec) => ({
        ...rec,
        moodboardImage: await generateMoodboardImage(rec.visualPrompt)
      }))
    );

    return NextResponse.json({
      analysis,
      inspiration,
      recommendations: withImages
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error?.message || 'Something went wrong while generating looks.'
      },
      { status: 500 }
    );
  }
}