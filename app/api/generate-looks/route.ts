import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
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
  inspirationDirection: inspirationDirectionSchema.nullable().optional(),
  uploadedItemImageBase64: z.string().optional(),
  uploadedItemImageMimeType: z.string().optional()
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
  inspirationDirection?: InspirationDirection | null,
  requestId?: string
): Promise<Recommendation[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.info('[generate-looks-debug] Sending OpenAI recommendation request', {
    requestId,
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    occasion,
    feeling,
    inspiration,
    direction: inspirationDirection?.title
  });

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

  console.info('[generate-looks-debug] OpenAI recommendation response received', {
    requestId,
    responseId: response.id,
    model: response.model,
    finishReason: response.choices[0]?.finish_reason
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
  inspirationDirection,
  requestId
}: {
  recommendation: Recommendation;
  analysis: ItemAnalysis;
  occasion: string;
  feeling: string;
  inspiration: string;
  inspirationDirection?: InspirationDirection | null;
  requestId?: string;
}): Promise<Recommendation> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.info('[generate-looks-debug] Sending critic request', {
    requestId,
    lookId: recommendation.id,
    lookType: recommendation.type
  });

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

  console.info('[generate-looks-debug] Critic response received', {
    requestId,
    lookId: recommendation.id,
    responseId: response.id,
    model: response.model,
    finishReason: response.choices[0]?.finish_reason
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
    console.error('[generate-looks-debug] Critic failed to rewrite weak look', {
      requestId,
      lookId: recommendation.id,
      scores
    });
    throw new Error('Quality critic failed to return a rewritten recommendation.');
  }

  if (shouldRewrite) {
    console.info('[generate-looks-debug] Rewriting weak look before response', {
      requestId,
      lookId: recommendation.id,
      scores
    });

    return {
      ...recommendation,
      ...result.recommendation!,
      id: recommendation.id,
      moodboardImage: null,
      qualityScores: scores
    };
  }

  console.info('[generate-looks-debug] Look passed critic', {
    requestId,
    lookId: recommendation.id,
    scores
  });

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

function imageExtensionFromMimeType(mimeType?: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  return 'png';
}

async function generateMoodboardImage({
  prompt,
  analysis,
  uploadedItemImageBase64,
  uploadedItemImageMimeType,
  requestId,
  lookId
}: {
  prompt: string;
  analysis: ItemAnalysis;
  uploadedItemImageBase64?: string;
  uploadedItemImageMimeType?: string;
  requestId?: string;
  lookId?: string;
}): Promise<string | null> {
  if (process.env.GENERATE_MOODBOARD_IMAGES === 'false') {
    console.info('[generate-looks-debug] Skipping synchronous moodboard image generation', {
      requestId,
      lookId,
      enabled: false
    });
    return null;
  }

  const collagePrompt = `${prompt}

Create a square fashion outfit inspiration collage / flat-lay using the uploaded garment image as the central hero piece.

Hard visual rules:
- Preserve the uploaded garment from the source image exactly. Do not redesign it.
- Keep the same garment category, color, material, pattern, silhouette, fit, sleeve length, length, collar/neckline, visible details, scale, and proportions.
- Do not crop, shorten, recolor, restyle, transform, replace, or simplify the garment.
- Arrange the suggested pairings around the uploaded garment as a polished styling collage.
- Show all key pairing items named in the look.
- Do not show a human model.
- Do not include text, labels, captions, UI, or watermarks.
- Keep the composition clean, editorial, and useful for deciding whether to wear the outfit.

Exact Garment DNA: ${garmentDescriptor(analysis)}.
${garmentDnaLockText(analysis)}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.info('[generate-looks-debug] Sending moodboard image request', {
      requestId,
      lookId,
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      hasUploadedImage: Boolean(uploadedItemImageBase64),
      uploadedItemImageMimeType,
      uploadedItemImageBase64Length: uploadedItemImageBase64?.length
    });

    const imageResponse = uploadedItemImageBase64
      ? await openai.images.edit({
          model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
          image: await toFile(
            Buffer.from(uploadedItemImageBase64, 'base64'),
            `uploaded-garment.${imageExtensionFromMimeType(uploadedItemImageMimeType)}`,
            { type: uploadedItemImageMimeType || 'image/png' }
          ),
          prompt: collagePrompt,
          input_fidelity: 'high',
          quality: 'low',
          size: '1024x1024',
          output_format: 'jpeg',
          output_compression: 85
        })
      : await openai.images.generate({
          model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
          prompt: collagePrompt,
          quality: 'low',
          size: '1024x1024',
          output_format: 'jpeg',
          output_compression: 85
        });

    console.info('[generate-looks-debug] Moodboard image response received', {
      requestId,
      lookId,
      hasData: Boolean(imageResponse.data?.length)
    });

    const first = imageResponse.data?.[0] as any;
    if (first?.b64_json) return `data:image/jpeg;base64,${first.b64_json}`;
    if (first?.url) return first.url;
    return null;
  } catch (error: any) {
    console.error('[generate-looks-debug] Moodboard image generation failed', {
      requestId,
      lookId,
      status: error?.status,
      message: error?.message,
      errorBody: error?.error || error?.response?.data || error
    });
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  console.info('[generate-looks-debug] Request received', {
    requestId,
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length')
  });

  if (!process.env.OPENAI_API_KEY) {
    console.error('[generate-looks-debug] Missing OpenAI API key', { requestId });
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY. Add it to .env.local and restart npm run dev.' },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch (error: any) {
    console.error('[generate-looks-debug] Failed to parse request JSON', {
      requestId,
      error: error?.message || error
    });

    return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[generate-looks-debug] Invalid request payload', {
      requestId,
      issues: parsed.error.flatten()
    });
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const {
    analysis,
    occasion,
    feeling,
    inspiration,
    inspirationDirection,
    uploadedItemImageBase64,
    uploadedItemImageMimeType
  } = parsed.data;

  try {
    const recommendations = await createRecommendations(
      analysis,
      occasion,
      feeling,
      inspiration,
      inspirationDirection,
      requestId
    );

    console.info('[generate-looks-debug] Candidate recommendations created', {
      requestId,
      recommendationCount: recommendations.length
    });

    const scoredRecommendations = await Promise.all(
      recommendations.map((recommendation) =>
        scoreAndRepairRecommendation({
          recommendation,
          analysis,
          occasion,
          feeling,
          inspiration,
          inspirationDirection,
          requestId
        })
      )
    );

    const withImages = await Promise.all(
      scoredRecommendations.map(async (rec) => {
        const groundedRec = enforceGarmentVisualPrompt(rec, analysis);

        return {
          ...groundedRec,
          moodboardImage: await generateMoodboardImage({
            prompt: groundedRec.visualPrompt,
            analysis,
            uploadedItemImageBase64,
            uploadedItemImageMimeType,
            requestId,
            lookId: groundedRec.id
          })
        };
      })
    );

    console.info('[generate-looks-debug] Returning JSON response', {
      requestId,
      status: 200,
      recommendationCount: withImages.length
    });

    return NextResponse.json({
      analysis,
      inspiration,
      inspirationDirection,
      recommendations: withImages
    });
  } catch (error: any) {
    console.error('[generate-looks-debug] Request failed', {
      requestId,
      status: error?.status,
      message: error?.message,
      errorBody: error?.error || error?.response?.data || error
    });

    return NextResponse.json(
      {
        error: error?.message || 'Something went wrong while generating looks.'
      },
      { status: error?.status || 500 }
    );
  }
}
