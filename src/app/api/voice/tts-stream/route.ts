import { synthesizeSpeechStream } from '@/lib/byteplus-tts';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_TEXT_LENGTH = 600;

export async function POST(request: Request) {
    const requestStartedAt = Date.now();
    try {
        const payload = (await request.json().catch(() => ({}))) as { text?: string };
        const text = payload.text?.trim() ?? '';

        if (!text) {
            return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
        }

        if (text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { error: `Text must be within ${MAX_TEXT_LENGTH} characters.` },
                { status: 400 }
            );
        }

        const tts = await synthesizeSpeechStream(text);
        const ttsSetupMs = Date.now() - requestStartedAt;

        console.info('[voice/tts-stream]', {
            textLength: text.length,
            audioMimeType: tts.audioMimeType,
            ttsSetupMs,
        });

        return new Response(tts.stream, {
            headers: {
                'Content-Type': tts.audioMimeType,
                'Cache-Control': 'no-store, no-transform',
                'X-Voice-Type': tts.voiceType,
                'X-TTS-Resource-Id': tts.resourceId,
                'X-TTS-Setup-Ms': String(ttsSetupMs),
            },
        });
    } catch (error) {
        console.error('[voice/tts-stream] failed:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unexpected TTS server failure.',
            },
            { status: 500 }
        );
    }
}

