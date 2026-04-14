import { NextRequest, NextResponse } from 'next/server';
import { generateWithNIM } from '@/lib/ai/nim';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
      model?: 'black-forest-labs/flux.1-kontext-dev' | 'microsoft/trellis';
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
    if (!action || !['summarize', 'flashcards', 'quiz', 'diagram', 'image-convert', '3d'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const isGenerationAction = action === 'diagram' || action === 'image-convert' || action === '3d';
    if (isGenerationAction && !body.prompt?.trim()) {
      return NextResponse.json({ error: 'Missing generation prompt' }, { status: 400 });
    }
    if (action === 'image-convert' && !body.image?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Missing valid image data URL' }, { status: 400 });
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
