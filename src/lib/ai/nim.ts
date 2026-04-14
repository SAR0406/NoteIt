import {
  AI_CONTEXT_CHAR_LIMIT,
  AI_FLASHCARD_BACK_CHAR_LIMIT,
  AI_FLASHCARD_FRONT_CHAR_LIMIT,
  AI_SUMMARY_POINT_LIMIT,
} from './constants';
import { sanitizeModelText } from './text';

const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
// Text/chat APIs and GenAI model endpoints are hosted on different NVIDIA domains.
const NVIDIA_NIM_GENAI_BASE_URL = process.env.NVIDIA_NIM_GENAI_BASE_URL || 'https://ai.api.nvidia.com/v1/genai';
const NVIDIA_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'openai/gpt-oss-120b';
const NVIDIA_NIM_USE_CASE = process.env.NVIDIA_NIM_USE_CASE || 'Retrieval Augmented Generation';

type AIAction = 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
type GenerationModel = 'black-forest-labs/flux.2-klein-4b' | 'microsoft/trellis';
const GENERATION_ACTIONS = ['diagram', 'image-convert', '3d'] as const;
const GENERATION_ACTION_SET = new Set<AIAction>(GENERATION_ACTIONS);
// Explicit allowlist keeps request targets fixed to known-safe endpoints.
const GENERATION_MODEL_ENDPOINTS: Record<GenerationModel, string> = {
  'black-forest-labs/flux.2-klein-4b': 'black-forest-labs/flux.2-klein-4b',
  'microsoft/trellis': 'microsoft/trellis',
};

export interface NIMRequestPayload {
  action: AIAction;
  title: string;
  htmlContent: string;
  tags: string[];
  handwritingIndex: string;
  attachmentIndex: string[];
  drawingIndex: string[];
  prompt?: string;
  image?: string;
  model?: GenerationModel;
}

interface NIMResult {
  summaryPoints?: string[];
  flashcards?: Array<{ front: string; back: string }>;
  generated?: {
    action: AIAction;
    model: GenerationModel;
    raw: unknown;
    previewImage?: string;
    assetUrl?: string;
  };
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

const toSafeHttpUrl = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.startsWith('https://')) return normalized;
  return undefined;
};

const toSafeDataImage = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.startsWith('data:image/')) return normalized;
  return undefined;
};

const toDataImageFromBase64 = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    const decoded = Buffer.from(normalized, 'base64');
    if (decoded.length === 0) return undefined;
    const reEncoded = decoded.toString('base64').replace(/=+$/g, '');
    const normalizedNoPadding = normalized.replace(/=+$/g, '');
    if (reEncoded !== normalizedNoPadding) return undefined;
  } catch {
    return undefined;
  }
  return `data:image/png;base64,${normalized}`;
};

const toSafePreviewImage = (value: unknown) => {
  return toSafeDataImage(value) ?? toSafeHttpUrl(value) ?? toDataImageFromBase64(value);
};

const readNestedString = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== 'object') return undefined;
  let cursor: unknown = value;
  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return typeof cursor === 'string' ? cursor : undefined;
};

const extractPreviewImage = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') return undefined;

  const candidates = [
    readNestedString(raw, ['image']),
    readNestedString(raw, ['output_image']),
    readNestedString(raw, ['preview_image']),
    readNestedString(raw, ['images', '0']),
    readNestedString(raw, ['images', '0', 'url']),
    readNestedString(raw, ['images', '0', 'image']),
    readNestedString(raw, ['images', '0', 'b64_json']),
    readNestedString(raw, ['images', '0', 'base64']),
    readNestedString(raw, ['output', '0', 'url']),
    readNestedString(raw, ['output', '0', 'image']),
    readNestedString(raw, ['output', '0', 'b64_json']),
    readNestedString(raw, ['data', '0', 'url']),
    readNestedString(raw, ['data', '0', 'image']),
    readNestedString(raw, ['data', '0', 'b64_json']),
    readNestedString(raw, ['b64_json']),
    readNestedString(raw, ['artifacts', '0', 'url']),
    readNestedString(raw, ['artifacts', '0', 'b64_json']),
    readNestedString(raw, ['artifacts', '0', 'base64']),
  ];
  for (const candidate of candidates) {
    const preview = toSafePreviewImage(candidate);
    if (preview) return preview;
  }

  return undefined;
};

const extractAssetUrl = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') return undefined;
  return (
    toSafeHttpUrl(readNestedString(raw, ['asset_url'])) ??
    toSafeHttpUrl(readNestedString(raw, ['assetUrl'])) ??
    toSafeHttpUrl(readNestedString(raw, ['model_url'])) ??
    toSafeHttpUrl(readNestedString(raw, ['mesh_url'])) ??
    toSafeHttpUrl(readNestedString(raw, ['url'])) ??
    toSafeHttpUrl(readNestedString(raw, ['artifacts', '0', 'url'])) ??
    toSafeHttpUrl(readNestedString(raw, ['artifacts', '0', 'asset_url']))
  );
};

const resolveGenerationModel = (payload: NIMRequestPayload): GenerationModel => {
  if (payload.action === '3d') return 'microsoft/trellis';
  // Use a single fixed FLUX model for all photo/diagram generation and image editing flows.
  return 'black-forest-labs/flux.2-klein-4b';
};

const buildMedicalStudyImagePrompt = (subject: string, action: Extract<AIAction, 'diagram' | 'image-convert'>) => {
  // Keep subject concise to reduce prompt dilution and improve instruction adherence.
  const cleanedSubject = sanitizeModelText(subject).slice(0, 240) || 'human anatomy structure';
  const modeInstruction =
    action === 'image-convert'
      ? 'Use the uploaded source image as reference and preserve the same core anatomical structure while improving clarity for study.'
      : 'Generate a new image from scratch.';
  return [
    `Create a detailed, anatomically accurate educational illustration of ${cleanedSubject} in clean diagram style.`,
    modeInstruction,
    'Subject only, centered and clear.',
    'No text, no labels, no legend, no watermark, no arrows, no annotations.',
    'This image must be suitable to stick in notes for study and label practice.',
  ].join(' ');
};

const callGenerationModel = async (
  payload: NIMRequestPayload,
  apiKey: string
): Promise<NIMResult['generated']> => {
  const model = resolveGenerationModel(payload);
  const prompt = payload.prompt?.trim();
  if (!prompt) throw new Error('Prompt is required for generation');

  let body: Record<string, unknown>;
  if (payload.action === '3d') {
    // Trellis controls two-stage structured latent + shape sampling quality/speed tradeoff.
    body = {
      prompt,
      slat_cfg_scale: 3,
      ss_cfg_scale: 7.5,
      slat_sampling_steps: 25,
      ss_sampling_steps: 25,
      seed: 0,
    };
  } else if (payload.action === 'image-convert') {
    if (!payload.image?.startsWith('data:image/')) {
      throw new Error('Image must be a data URL with format: data:image/{type};base64,{data}');
    }
    const studyPrompt = buildMedicalStudyImagePrompt(prompt, 'image-convert');
    body = {
      prompt: studyPrompt,
      image: payload.image,
      aspect_ratio: 'match_input_image',
      steps: 4,
      seed: 0,
    };
  } else {
    const studyPrompt = buildMedicalStudyImagePrompt(prompt, 'diagram');
    body = {
      prompt: studyPrompt,
      width: 1024,
      height: 1024,
      steps: 4,
      seed: 0,
    };
  }

  const endpoint = GENERATION_MODEL_ENDPOINTS[model];

  const response = await fetch(`${NVIDIA_NIM_GENAI_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`NIM generation request failed (${response.status}): ${responseText.slice(0, 200)}`);
  }

  const raw = (await response.json()) as unknown;
  return {
    action: payload.action,
    model,
    raw,
    previewImage: extractPreviewImage(raw),
    assetUrl: extractAssetUrl(raw),
  };
};

export async function generateWithNIM(payload: NIMRequestPayload): Promise<NIMResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  if (GENERATION_ACTION_SET.has(payload.action)) {
    const generated = await callGenerationModel(payload, apiKey);
    return { generated };
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
