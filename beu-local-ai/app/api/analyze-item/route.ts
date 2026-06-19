import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { itemRecognitionPrompt } from '@/lib/prompts';
import type { ItemAnalysis } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  imageBase64: z.string().min(100),
  imageMimeType: z.string().min(3)
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
    return NextResponse.json({ error: 'Invalid image upload payload.' }, { status: 400 });
  }

  const { imageBase64, imageMimeType } = parsed.data;
  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

  try {
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
    console.error(error);
    return NextResponse.json({ error: error?.message || 'Something went wrong while analyzing the item.' }, { status: 500 });
  }
}
