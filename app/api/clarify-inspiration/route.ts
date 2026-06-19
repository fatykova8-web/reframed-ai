import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const requestSchema = z.object({
  inspiration: z.string().min(1)
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
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY.' }, { status: 500 });
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inspiration.' }, { status: 400 });
  }

  const { inspiration } = parsed.data;

  const prompt = `
The user entered this fashion inspiration:

"${inspiration}"

Interpret it into 4 possible styling directions.

Each direction should be:
- short
- specific
- useful for outfit generation
- understandable to a normal user
- not longer than 12 words

For vague references, clarify the possible meanings.

Example:
For "Jean Paul Gaultier 2000":
[
  "Nautical stripes and sailor codes",
  "Corsetry and body-conscious structure",
  "Mesh, tattoo-print, and sheer layering",
  "Editorial runway styling with sharp attitude"
]

Return ONLY valid JSON:
{
  "directions": ["direction 1", "direction 2", "direction 3", "direction 4"]
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

    const result = safeJsonParse<{ directions: string[] }>(
      response.choices[0]?.message?.content || '{}',
      { directions: [] }
    );

    return NextResponse.json({ directions: result.directions.slice(0, 4) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not clarify inspiration.' },
      { status: 500 }
    );
  }
}
