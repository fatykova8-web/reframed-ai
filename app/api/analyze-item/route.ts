import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { itemRecognitionPrompt } from '@/lib/prompts';
import type { ItemAnalysis } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGE_BASE64_LENGTH = 4_200_000;

const requestSchema = z.object({
  imageBase64: z.string().min(100),
  imageMimeType: z.string().min(3)
});

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const contentLength = req.headers.get('content-length');

  console.info('[analyze-item-debug] Request received', {
    requestId,
    contentType: req.headers.get('content-type'),
    contentLength
  });

  if (!process.env.OPENAI_API_KEY) {
    console.error('[analyze-item-debug] Missing OpenAI API key', { requestId });
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY. Add it to .env.local and restart npm run dev.' },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch (error: any) {
    console.error('[analyze-item-debug] Failed to parse request JSON', {
      requestId,
      contentLength,
      error: error?.message || error
    });

    return NextResponse.json(
      { error: 'Invalid JSON upload payload. The image may be too large.' },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[analyze-item-debug] Invalid upload payload', {
      requestId,
      issues: parsed.error.flatten()
    });
    return NextResponse.json({ error: 'Invalid image upload payload.' }, { status: 400 });
  }

  const { imageBase64, imageMimeType } = parsed.data;

  console.info('[analyze-item-debug] Upload payload parsed', {
    requestId,
    imageMimeType,
    base64Length: imageBase64.length,
    approximateImageBytes: Math.round((imageBase64.length * 3) / 4)
  });

  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    console.error('[analyze-item-debug] Upload rejected by API size guard', {
      requestId,
      base64Length: imageBase64.length,
      maxImageBase64Length: MAX_IMAGE_BASE64_LENGTH
    });

    return NextResponse.json(
      { error: 'This image is too large. Please upload an image under 3 MB.' },
      { status: 413 }
    );
  }

  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    console.info('[analyze-item-debug] Sending OpenAI vision request', {
      requestId,
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: itemRecognitionPrompt() },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this single clothing item for Reframed. Return JSON only.' },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ]
    });

    console.info('[analyze-item-debug] OpenAI vision response received', {
      requestId,
      responseId: response.id,
      model: response.model,
      finishReason: response.choices[0]?.finish_reason
    });

    const analysis = safeJsonParse<ItemAnalysis>(response.choices[0]?.message?.content || '{}', {
      isSingleItem: false,
      error: 'Could not analyze item.',
      category: 'Unknown',
      color: 'Multicolor',
      material: 'Unknown',
      pattern: 'unknown',
      confidence: 0,
      notes: 'AI response could not be parsed.'
    });

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('[analyze-item-debug] OpenAI vision request failed', {
      requestId,
      status: error?.status,
      message: error?.message,
      errorBody: error?.error || error?.response?.data || error
    });

    return NextResponse.json(
      { error: error?.message || 'Something went wrong while analyzing the item.' },
      { status: error?.status || 500 }
    );
  }
}
