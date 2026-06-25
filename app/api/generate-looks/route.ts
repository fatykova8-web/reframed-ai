import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { recommendationCriticPrompt, recommendationPrompt } from '@/lib/prompts';
import { garmentDnaLockText, garmentDnaText } from '@/lib/garmentDna';
import type {
  InspirationDirection,
  ItemAnalysis,
  Recommendation,
  RecommendationScore
} from '@/lib/types';

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
  fit: z.string().optional(),
  sleeveLength: z.string().optional(),
  length: z.string().optional(),
  collarOrNeckline: z.string().optional(),
  majorDetails: z.array(z.string()).optional(),
  formality: z.string().optional(),
  confidence: z.number().default(1),
  notes: z.string().optional()
});

const referenceTypeSchema = z.enum([
  'designer',
  'celebrity/musician',
  'movie/tv',
  'event',
  'food/drink',
  'place/travel',
  'aesthetic',
  'historical era',
  'vague/unknown'
]);

const inspirationDirectionSchema = z.object({
  title: z.string(),
  referenceType: referenceTypeSchema.optional(),
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
});

const requestSchema = z.object({
  analysis: itemAnalysisSchema,
  occasion: z.string().min(1),
  feeling: z.string().min(1),
  inspiration: z.string().optional().default(''),
  inspirationDirection: inspirationDirectionSchema.nullable().optional()
});

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

type RecommendationDraft = Omit<Recommendation, 'id' | 'moodboardImage' | 'qualityScores'>;

type CriticResult = {
  scores?: RecommendationScore;
  recommendation?: RecommendationDraft;
};

async function createRecommendations(
  analysis: ItemAnalysis,
  occasion: string,
  feeling: string,
  inspiration: string,
  inspirationDirection?: InspirationDirection | null
): Promise<Recommendation[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
          inspiration as any,
          inspirationDirection
        )
      }
    ]
  });

  const parsed = safeJsonParse<{
    recommendations: RecommendationDraft[];
  }>(response.choices[0]?.message?.content || '{}', { recommendations: [] });

  return parsed.recommendations.slice(0, 3).map((rec, index) => ({
    id: `look-${Date.now()}-${index}`,
    moodboardImage: null,
    ...rec
  }));
}

async function scoreAndRepairRecommendation({
  recommendation,
  analysis,
  occasion,
  feeling,
  inspiration,
  inspirationDirection
}: {
  recommendation: Recommendation;
  analysis: ItemAnalysis;
  occasion: string;
  feeling: string;
  inspiration: string;
  inspirationDirection?: InspirationDirection | null;
}): Promise<Recommendation> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a strict fashion recommendation critic and repair editor. Return only valid JSON.'
      },
      {
        role: 'user',
        content: recommendationCriticPrompt({
          analysis,
          occasion,
          feeling,
          inspiration,
          inspirationDirection,
          recommendation
        })
      }
    ]
  });

  const result = safeJsonParse<CriticResult>(
    response.choices[0]?.message?.content || '{}',
    {}
  );

  const scores = result.scores;
  const hasRequiredScores =
    typeof scores?.referenceFit === 'number' &&
    typeof scores?.garmentFidelity === 'number' &&
    typeof scores?.visualPromptCompleteness === 'number' &&
    typeof scores?.wearability === 'number' &&
    typeof scores?.originality === 'number';

  const shouldRewrite =
    !hasRequiredScores ||
    (scores.referenceFit < 8 ||
      scores.garmentFidelity < 9 ||
      scores.visualPromptCompleteness < 8);

  if (shouldRewrite && !result.recommendation) {
    throw new Error('Quality critic failed to return a rewritten recommendation.');
  }

  if (shouldRewrite) {
    return {
      ...recommendation,
      ...result.recommendation!,
      id: recommendation.id,
      moodboardImage: null,
      qualityScores: scores
    };
  }

  return {
    ...recommendation,
    qualityScores: scores
  };
}

function garmentDescriptor(analysis: ItemAnalysis) {
  return garmentDnaText(analysis);
}

function enforceGarmentVisualPrompt(rec: Recommendation, analysis: ItemAnalysis): Recommendation {
  const garmentLock = garmentDnaLockText(analysis);

  return {
    ...rec,
    visualPrompt: `${rec.visualPrompt} Central hero uploaded garment must match this immutable DNA: ${garmentDescriptor(analysis)}. ${garmentLock}`
  };
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

  const { analysis, occasion, feeling, inspiration, inspirationDirection } = parsed.data;

  try {
    const recommendations = await createRecommendations(
      analysis,
      occasion,
      feeling,
      inspiration,
      inspirationDirection
    );

    const scoredRecommendations = await Promise.all(
      recommendations.map((recommendation) =>
        scoreAndRepairRecommendation({
          recommendation,
          analysis,
          occasion,
          feeling,
          inspiration,
          inspirationDirection
        })
      )
    );

    const withImages = await Promise.all(
      scoredRecommendations.map(async (rec) => {
        const groundedRec = enforceGarmentVisualPrompt(rec, analysis);

        return {
          ...groundedRec,
          moodboardImage: await generateMoodboardImage(groundedRec.visualPrompt, analysis)
        };
      })
    );

    return NextResponse.json({
      analysis,
      inspiration,
      inspirationDirection,
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
