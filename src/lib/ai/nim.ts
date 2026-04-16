import {
  AI_CONTEXT_CHAR_LIMIT,
  AI_FLASHCARD_BACK_CHAR_LIMIT,
  AI_FLASHCARD_FRONT_CHAR_LIMIT,
  AI_SUMMARY_POINT_LIMIT,
} from './constants';
import { sanitizeModelText } from './text';

const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'minimaxai/minimax-m2.7'; // Using minimax as default based on provided code

type AIAction = 'summarize' | 'flashcards' | 'quiz' | 'diagram' | 'image-convert' | '3d';
type GenerationModel = 'black-forest-labs/flux.2-klein-4b' | 'microsoft/trellis';
const GENERATION_ACTIONS = ['diagram', 'image-convert', '3d'] as const;
const GENERATION_ACTION_SET = new Set<AIAction>(GENERATION_ACTIONS);

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
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

// --- IMAGE & 3D GENERATION LOGIC ---
const callGenerationModel = async (
  payload: NIMRequestPayload,
  apiKey: string
): Promise<NIMResult['generated']> => {
  const prompt = payload.prompt?.trim();
  if (!prompt) throw new Error('Prompt is required for generation');

  let invokeUrl = '';
  let body: Record<string, unknown> = {};
  let model: GenerationModel;

  if (payload.action === '3d') {
    // 3D Model Generation via Trellis
    model = 'microsoft/trellis';
    invokeUrl = `https://ai.api.nvidia.com/v1/genai/${model}`;
    body = {
      prompt,
      slat_cfg_scale: 3,
      ss_cfg_scale: 7.5,
      slat_sampling_steps: 25,
      ss_sampling_steps: 25,
      seed: 0
    };
  } else {
    // Image Generation via Flux
    model = 'black-forest-labs/flux.2-klein-4b';
    invokeUrl = `https://ai.api.nvidia.com/v1/genai/${model}`;
    body = {
      prompt: payload.action === 'image-convert' 
        ? `Clean study-style editing of: ${prompt}` 
        : prompt,
      width: 1024,
      height: 1024,
      seed: 0,
      steps: 4
    };
  }

  const response = await fetch(invokeUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    }
  });

  if (response.status !== 200) {
    const errBody = await response.text();
    throw new Error(`Invocation failed with status ${response.status} ${errBody}`);
  }
  
  const raw: any = await response.json();
  
  // Extract URLs safely (fallback logic depending on specific NVIDIA JSON structure)
  const assetUrl = raw?.asset_url || raw?.artifacts?.[0]?.url || raw?.artifacts?.[0]?.asset_url;
  const previewImage = raw?.image ? `data:image/jpeg;base64,${raw.image}` : undefined;

  return {
    action: payload.action,
    model,
    raw,
    previewImage: previewImage || assetUrl, // Fallback to asset if preview base64 isn't returned
    assetUrl: assetUrl || previewImage
  };
};

export async function generateWithNIM(payload: NIMRequestPayload): Promise<NIMResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  // 1. Generation Models (Image / 3D)
  if (GENERATION_ACTION_SET.has(payload.action)) {
    const generated = await callGenerationModel(payload, apiKey);
    return { generated };
  }

  // 2. Text Models (Summary / Flashcards / Quiz)
  const plainText = clip(stripHtml(payload.htmlContent));
  const contextHints = clip(
    [payload.handwritingIndex, ...payload.attachmentIndex, ...payload.drawingIndex]
      .filter(Boolean)
      .join(' | ')
  );

  const contextPrompt = [
    `Title: ${payload.title}`,
    `Tags: ${payload.tags.join(', ') || 'None'}`,
    `Text content: ${plainText || 'No typed content.'}`,
    `Indexed context: ${contextHints || 'None'}`,
  ].join('\n');

  // --- SUMMARIZE ---
  if (payload.action === 'summarize') {
    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_NIM_MODEL,
        messages: [
          { role: 'system', content: 'You are an MBBS study assistant. Create 5 to 8 concise MBBS revision bullet points. Return ONLY valid JSON: {"summaryPoints": ["point 1", "point 2"]}' },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    
    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = extractJsonObject(content);
    return parsed ? JSON.parse(parsed) : { summaryPoints: [] };
  }

  // --- FLASHCARDS & QUIZ (Parallel Execution) ---
  const isQuiz = payload.action === 'quiz';
  const requestCount = isQuiz ? 8 : 6; // 8 for quiz, 6 for standard flashcards
  const taskInstruction = isQuiz 
    ? 'Create exactly ONE unique, highly-detailed clinically useful Q/A flashcard for exam revision.'
    : 'Create exactly ONE unique, high-yield flashcard from the key concepts provided.';

  // Build array of parallel Promises
  const parallelRequests = Array.from({ length: requestCount }).map((_, index) => {
    return fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_NIM_MODEL,
        messages: [
          { 
            role: 'system', 
            content: `You are an MBBS study assistant. ${taskInstruction} Focus on aspect #${index + 1} of the text to ensure variety. Return ONLY valid JSON exactly like this: {"front": "question", "back": "answer"}`
          },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.7, // Higher temp to get unique questions from parallel calls
        max_tokens: 500,
      }),
    }).then(res => res.json());
  });

  // Execute all fetches concurrently
  const results = await Promise.all(parallelRequests);
  
  // Parse and assemble results
  const combinedFlashcards: Array<{front: string, back: string}> = [];
  
  for (const data of results) {
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = extractJsonObject(content);
    if (parsed) {
      try {
        const json = JSON.parse(parsed);
        if (json.front && json.back) {
          combinedFlashcards.push({
            front: sanitizeModelText(json.front).slice(0, AI_FLASHCARD_FRONT_CHAR_LIMIT),
            back: sanitizeModelText(json.back).slice(0, AI_FLASHCARD_BACK_CHAR_LIMIT)
          });
        }
      } catch (e) {
        console.warn("Failed to parse a parallel card result", e);
      }
    }
  }

  return { flashcards: combinedFlashcards };
}
