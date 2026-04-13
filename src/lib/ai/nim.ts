import {
  AI_CONTEXT_CHAR_LIMIT,
  AI_FLASHCARD_BACK_CHAR_LIMIT,
  AI_FLASHCARD_FRONT_CHAR_LIMIT,
  AI_SUMMARY_POINT_LIMIT,
} from './constants';
import { sanitizeModelText } from './text';

const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'openai/gpt-oss-120b';
const NVIDIA_NIM_USE_CASE = process.env.NVIDIA_NIM_USE_CASE || 'Retrieval Augmented Generation';

type AIAction = 'summarize' | 'flashcards' | 'quiz';

export interface NIMRequestPayload {
  action: AIAction;
  title: string;
  htmlContent: string;
  tags: string[];
  handwritingIndex: string;
  attachmentIndex: string[];
  drawingIndex: string[];
}

interface NIMResult {
  summaryPoints?: string[];
  flashcards?: Array<{ front: string; back: string }>;
}

const stripHtml = (value: string) => {
  let out = '';
  let inTag = false;
  for (const char of value) {
    if (char === '<') {
      inTag = true;
      out += ' ';
      continue;
    }
    if (char === '>') {
      inTag = false;
      continue;
    }
    if (!inTag) out += char;
  }
  return out.replace(/\s+/g, ' ').trim();
};

const clip = (value: string, max = AI_CONTEXT_CHAR_LIMIT) => {
  if (value.length <= max) return value;
  const sliced = value.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace > max - 120) return sliced.slice(0, lastSpace);
  return sliced;
};

const extractJsonObject = (value: string) => {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return value.slice(start, end + 1);
};

const parseAiOutput = (text: string): NIMResult => {
  const maybeJson = extractJsonObject(text);
  if (!maybeJson) return {};
  try {
    const parsed = JSON.parse(maybeJson) as NIMResult;
    const summaryPoints = Array.isArray(parsed.summaryPoints)
      ? parsed.summaryPoints.map((point) => sanitizeModelText(String(point))).filter(Boolean).slice(0, AI_SUMMARY_POINT_LIMIT)
      : undefined;
    const flashcards = Array.isArray(parsed.flashcards)
      ? parsed.flashcards
          .map((card) => ({
            front: sanitizeModelText(String(card.front ?? '')).slice(0, AI_FLASHCARD_FRONT_CHAR_LIMIT),
            back: sanitizeModelText(String(card.back ?? '')).slice(0, AI_FLASHCARD_BACK_CHAR_LIMIT),
          }))
          .filter((card) => card.front.length > 3 && card.back.length > 5)
          .slice(0, 10)
      : undefined;
    return { summaryPoints, flashcards };
  } catch {
    return {};
  }
};

export async function generateWithNIM(payload: NIMRequestPayload): Promise<NIMResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  const plainText = clip(stripHtml(payload.htmlContent));
  const contextHints = clip(
    [payload.handwritingIndex, ...payload.attachmentIndex, ...payload.drawingIndex]
      .filter(Boolean)
      .join(' | ')
  );

  const taskInstruction = (() => {
    if (payload.action === 'summarize') {
      return 'Create 5 to 8 concise MBBS revision bullet points.';
    }
    if (payload.action === 'quiz') {
      return 'Create 6 clinically useful Q/A cards for exam revision.';
    }
    return 'Create 5 high-yield flashcards from key concepts.';
  })();

  const prompt = [
    'You are an MBBS study assistant.',
    `Use case: ${NVIDIA_NIM_USE_CASE}.`,
    taskInstruction,
    'Return ONLY valid JSON with this schema:',
    '{"summaryPoints": string[], "flashcards":[{"front":string,"back":string}]}',
    'If a field is not needed, return an empty array.',
    `Title: ${payload.title}`,
    `Tags: ${payload.tags.join(', ') || 'None'}`,
    `Text content: ${plainText || 'No typed content.'}`,
    `Indexed context (handwriting/document OCR): ${contextHints || 'None'}`,
  ].join('\n');

  const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: NVIDIA_NIM_MODEL,
      messages: [
        { role: 'system', content: 'Respond with strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 1200,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NIM request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content ?? '';
  return parseAiOutput(content);
}
