const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_NIM_ASR_MODEL = process.env.NVIDIA_NIM_ASR_MODEL || 'openai/whisper-large-v3';

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
// Include common MIME aliases returned by different browsers/recorders.
const EXTENSION_BY_MIME: Record<string, 'wav' | 'webm' | 'flac' | 'opus' | 'mp3' | 'm4a'> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'audio/opus': 'opus',
  'audio/ogg': 'opus',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
};

export interface ASRRequestPayload {
  audioBase64: string;
  mimeType: string;
  languageCode?: string;
  translateToEnglish?: boolean;
}

// Remove null bytes that may appear in some provider responses before rendering/storing.
const sanitizeTranscript = (value: string) => value.replace(/\u0000/g, '').trim();

export async function transcribeWithNIM(payload: ASRRequestPayload) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured');

  const audioBuffer = Buffer.from(payload.audioBase64, 'base64');
  if (!audioBuffer.length) throw new Error('Audio payload is empty');
  if (audioBuffer.length > MAX_AUDIO_BYTES) throw new Error('Audio payload is too large');

  const form = new FormData();
  const safeExtension = EXTENSION_BY_MIME[payload.mimeType.toLowerCase()];
  if (!safeExtension) throw new Error('Unsupported audio format');
  const filename = `audio.${safeExtension}`;
  const audioBlob = new Blob([audioBuffer], { type: payload.mimeType });
  form.append('file', audioBlob, filename);
  form.append('model', NVIDIA_NIM_ASR_MODEL);
  form.append('response_format', 'json');

  const targetTranslate = Boolean(payload.translateToEnglish);
  // "multi" relies on provider-side language detection, so we omit explicit language in that mode.
  if (!targetTranslate && payload.languageCode && payload.languageCode !== 'multi') {
    form.append('language', payload.languageCode);
  }

  const endpoint = targetTranslate ? 'translations' : 'transcriptions';
  const response = await fetch(`${NVIDIA_NIM_BASE_URL}/audio/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NIM ASR request failed (${response.status}): ${body.slice(0, 250)}`);
  }

  const data = (await response.json()) as { text?: string };
  const text = sanitizeTranscript(data.text ?? '');
  if (!text) throw new Error('No transcript returned from ASR model');
  return { text };
}
