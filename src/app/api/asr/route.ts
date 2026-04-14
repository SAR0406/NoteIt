import { NextRequest, NextResponse } from 'next/server';
import { transcribeWithNIM } from '@/lib/ai/asr';

const MAX_AUDIO_DATA_URL_LENGTH = 22_000_000;
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/flac',
  'audio/opus',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
]);

const parseAudioDataUrl = (value: string) => {
  // Matches: data:audio/{mime-subtype};base64,{base64-encoded-audio}
  const match = value.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) return null;
  return { mimeType, audioBase64: match[2] };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      audioDataUrl?: string;
      languageCode?: string;
      translateToEnglish?: boolean;
    };

    if (!body.audioDataUrl || body.audioDataUrl.length > MAX_AUDIO_DATA_URL_LENGTH) {
      return NextResponse.json({ error: 'Invalid audio payload' }, { status: 400 });
    }

    const parsed = parseAudioDataUrl(body.audioDataUrl);
    if (!parsed) {
      return NextResponse.json({ error: 'Audio must be a valid data URL' }, { status: 400 });
    }

    const result = await transcribeWithNIM({
      audioBase64: parsed.audioBase64,
      mimeType: parsed.mimeType,
      languageCode: body.languageCode?.trim() || 'en',
      translateToEnglish: Boolean(body.translateToEnglish),
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected ASR error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
