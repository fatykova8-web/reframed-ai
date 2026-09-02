import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { recommendationCriticPrompt, recommendationPrompt } from '@/lib/prompts';
import { garmentDnaLockText, garmentDnaText } from '@/lib/garmentDna';
import type {
  InspirationDirection,
  ItemAnalysis,
  Recommendation,
  RecommendationScore,
  StylingContext
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

const stylingContextSchema = z.object({
  rawText: z.string().default(''),
  occasion: z.string().default(''),
  city: z.string().optional(),
  timing: z.string().default('unspecified timing'),
  season: z.string().default('unspecified season'),
  weatherSummary: z.string().default(''),
  practicalityNotes: z.array(z.string()).default([]),
  isWeatherLive: z.boolean().default(false)
});

const requestSchema = z.object({
  analysis: itemAnalysisSchema,
  occasion: z.string().min(1),
  stylingContext: stylingContextSchema.optional(),
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
  stylingContext: StylingContext | undefined,
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
          inspirationDirection,
          stylingContext
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
  stylingContext,
  feeling,
  inspiration,
  inspirationDirection,
  requestId
}: {
  recommendation: Recommendation;
  analysis: ItemAnalysis;
  occasion: string;
  stylingContext?: StylingContext;
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
          stylingContext,
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

async function diversifyRecommendationSet({
  recommendations,
  analysis,
  occasion,
  stylingContext,
  feeling,
  inspiration,
  inspirationDirection,
  requestId
}: {
  recommendations: Recommendation[];
  analysis: ItemAnalysis;
  occasion: string;
  stylingContext?: StylingContext;
  feeling: string;
  inspiration: string;
  inspirationDirection?: InspirationDirection | null;
  requestId?: string;
}): Promise<Recommendation[]> {
  if (recommendations.length < 2) return recommendations;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.info('[generate-looks-debug] Sending set diversity request', {
    requestId,
    recommendationCount: recommendations.length
  });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a fashion editor improving a set of outfit recommendations. Return only valid JSON.'
      },
      {
        role: 'user',
        content: `Review these 3 Reframed styling recommendations as a set.

User-confirmed garment:
${JSON.stringify(analysis, null, 2)}

Occasion: ${occasion}
Detected wearing context: ${stylingContext ? JSON.stringify(stylingContext, null, 2) : 'None inferred'}
Desired feeling: ${feeling}
Original inspiration: ${inspiration || 'No specific inspiration provided'}
Selected inspiration direction: ${
          inspirationDirection ? JSON.stringify(inspirationDirection, null, 2) : 'None selected'
        }

Current recommendations:
${JSON.stringify(recommendations, null, 2)}

Rewrite only what is needed so the 3 options are clearly different outfit strategies.

Rules:
- Keep exactly 3 recommendations with these type values: Conservative, Balanced, Statement.
- Keep the uploaded garment as the hero in every look.
- Keep the selected inspiration/direction as the primary reference in every look.
- Do not introduce unrelated references.
- Do not repeat the same bottom silhouette across options unless unavoidable.
- Do not repeat the same shoe type across options.
- Do not repeat the same bag/accessory strategy across options.
- Do not repeat the same unexpectedMove.
- Conservative should be easiest to wear.
- Balanced should add a visible styling twist.
- Statement should be the boldest but still realistic.
- Each pairings array must name different supporting pieces.
- Each visualPrompt must describe a different supporting collage composition.

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "type": "Conservative",
      "title": "short title",
      "rationale": "one sentence",
      "reference": "specific selected inspiration or selected direction used",
      "unexpectedMove": "one specific styling move",
      "pairings": ["pairing 1", "pairing 2", "pairing 3", "pairing 4"],
      "explanation": "2-3 sentences",
      "visualPrompt": "flat-lay fashion moodboard prompt describing only the supporting pieces, cultural reference, and styling energy"
    }
  ]
}`
      }
    ]
  });

  console.info('[generate-looks-debug] Set diversity response received', {
    requestId,
    responseId: response.id,
    model: response.model,
    finishReason: response.choices[0]?.finish_reason
  });

  const parsed = safeJsonParse<{
    recommendations?: RecommendationDraft[];
  }>(response.choices[0]?.message?.content || '{}', {});

  if (!parsed.recommendations?.length) {
    console.error('[generate-looks-debug] Set diversity returned no recommendations', {
      requestId
    });
    return recommendations;
  }

  return parsed.recommendations.slice(0, 3).map((rec, index) => ({
    ...recommendations[index],
    ...rec,
    id: recommendations[index]?.id || `look-${Date.now()}-${index}`,
    moodboardImage: null
  }));
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

async function generateMoodboardImage({
  analysis,
  recommendation,
  requestId,
  lookId
}: {
  analysis: ItemAnalysis;
  recommendation: Recommendation;
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

  const garmentCategory = String(analysis.category || 'garment').toLowerCase();
  const blockedGarmentTerms = [
    garmentCategory,
    'shirt',
    'blouse',
    'top',
    'dress',
    'skirt',
    'jacket',
    'vest',
    'sweater',
    't-shirt',
    'crop top',
    'jumpsuit',
    'overalls'
  ]
    .filter((term, index, terms) => Boolean(term) && terms.indexOf(term) === index)
    .join(', ');

  const collagePrompt = `Create a square fashion outfit inspiration collage / flat-lay for this styling recommendation.

Look title:
${recommendation.title}

Reference:
${recommendation.reference || 'No specific reference'}

Unexpected styling move:
${recommendation.unexpectedMove || 'None'}

Supporting pieces to show:
${recommendation.pairings.map((pairing) => `- ${pairing}`).join('\n')}

Styling rationale:
${recommendation.rationale}

Explanation:
${recommendation.explanation}

Important composition rule:
- The app will overlay the user's exact uploaded garment photo on top of this collage.
- Generate the supporting outfit pieces, accessories, color mood, and reference atmosphere around a clean open space in the upper-left area.
- Do not recreate, repaint, redraw, replace, or include another version of the uploaded garment.
- Do not include any standalone ${blockedGarmentTerms} that could be mistaken for the uploaded item.
- Show all key pairing items named in the look, arranged as a polished styling board around the reserved source-item space.
- Do not show a human model.
- Do not include text, labels, captions, UI, or watermarks.
- Keep the composition clean, editorial, and useful for deciding whether to wear the outfit.
- Use the selected reference as atmosphere and styling taste only; the uploaded garment itself is already handled by the app overlay.

Uploaded garment already handled by overlay:
${garmentDescriptor(analysis)}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.info('[generate-looks-debug] Sending moodboard image request', {
      requestId,
      lookId,
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
    });

    const imageResponse = await openai.images.generate({
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
    stylingContext,
    feeling,
    inspiration,
    inspirationDirection
  } = parsed.data;

  try {
    const recommendations = await createRecommendations(
      analysis,
      occasion,
      stylingContext,
      feeling,
      inspiration,
      inspirationDirection,
      requestId
    );

    console.info('[generate-looks-debug] Candidate recommendations created', {
      requestId,
      recommendationCount: recommendations.length
    });

    const diversifiedRecommendations = await diversifyRecommendationSet({
      recommendations,
      analysis,
      occasion,
      stylingContext,
      feeling,
      inspiration,
      inspirationDirection,
      requestId
    });

    const scoredRecommendations = await Promise.all(
      diversifiedRecommendations.map((recommendation) =>
        scoreAndRepairRecommendation({
          recommendation,
          analysis,
          occasion,
          stylingContext,
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
            analysis,
            recommendation: groundedRec,
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
