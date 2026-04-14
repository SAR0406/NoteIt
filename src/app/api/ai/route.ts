import { NextRequest, NextResponse } from 'next/server';
import { generateWithNIM } from '@/lib/ai/nim';

const VALID_ACTIONS = ['summarize', 'flashcards', 'quiz', 'diagram', 'image-convert', '3d'] as const;
const GENERATION_ACTIONS = ['diagram', 'image-convert', '3d'] as const;
const GENERATION_ACTION_SET = new Set<string>(GENERATION_ACTIONS);
// 8MB keeps request payloads within practical browser/API limits and avoids oversized base64 uploads.
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
const IMAGE_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/;
const VALID_GENERATION_MODELS = [
  'black-forest-labs/flux.2-klein-4b',
  'microsoft/trellis',
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
      model?: 'black-forest-labs/flux.2-klein-4b' | 'microsoft/trellis';
      prompt?: string;
      image?: string;
      note?: {
        title?: string;
        content?: string;
        tags?: string[];
        handwritingIndex?: string;
        attachments?: Array<{ indexedText?: string }>;
        drawings?: Array<{ indexedText?: string }>;
      };
    };

    const action = body.action;
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (body.model && !VALID_GENERATION_MODELS.includes(body.model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    const isGenerationAction = GENERATION_ACTION_SET.has(action);
    if (isGenerationAction && !body.prompt?.trim()) {
      return NextResponse.json({ error: 'Missing generation prompt' }, { status: 400 });
    }
    if (action === 'image-convert' && (!body.image || !IMAGE_DATA_URL_PATTERN.test(body.image))) {
      return NextResponse.json({ error: 'Missing valid image data URL' }, { status: 400 });
    }
    if (action === 'image-convert' && body.image && body.image.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return NextResponse.json({ error: 'Image data URL is too large' }, { status: 400 });
    }

    const note = body.note;
    const result = await generateWithNIM({
      action,
      model: body.model,
      prompt: body.prompt,
      image: body.image,
      title: note?.title ?? 'Untitled Note',
      htmlContent: note?.content ?? '',
      tags: Array.isArray(note?.tags) ? note.tags : [],
      handwritingIndex: note?.handwritingIndex ?? '',
      attachmentIndex: (note?.attachments ?? []).map((a) => a.indexedText ?? ''),
      drawingIndex: (note?.drawings ?? []).map((d) => d.indexedText ?? ''),
    });

    return NextResponse.json({
      summaryPoints: result.summaryPoints ?? [],
      flashcards: result.flashcards ?? [],
      generated: result.generated ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected AI error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
