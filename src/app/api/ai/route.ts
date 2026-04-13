import { NextRequest, NextResponse } from 'next/server';
import { generateWithNIM } from '@/lib/ai/nim';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: 'summarize' | 'flashcards' | 'quiz';
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
    if (!action || !['summarize', 'flashcards', 'quiz'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const note = body.note;
    if (!note) {
      return NextResponse.json({ error: 'Missing note payload' }, { status: 400 });
    }

    const result = await generateWithNIM({
      action,
      title: note.title ?? 'Untitled Note',
      htmlContent: note.content ?? '',
      tags: Array.isArray(note.tags) ? note.tags : [],
      handwritingIndex: note.handwritingIndex ?? '',
      attachmentIndex: (note.attachments ?? []).map((a) => a.indexedText ?? ''),
      drawingIndex: (note.drawings ?? []).map((d) => d.indexedText ?? ''),
    });

    return NextResponse.json({
      summaryPoints: result.summaryPoints ?? [],
      flashcards: result.flashcards ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected AI error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
