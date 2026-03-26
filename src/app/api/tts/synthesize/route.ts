import { synthesizeSpeech } from '@/lib/aliyun-tts/server';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

interface SynthesizeRequest {
    text: string;
    voice?: string;
    format?: 'mp3' | 'wav' | 'pcm';
    sampleRate?: 8000 | 16000 | 48000;
    volume?: number;
    speechRate?: number;
    pitchRate?: number;
}

// POST /api/tts/synthesize - 合成语音
export async function POST(request: NextRequest) {
    try {
        const body: SynthesizeRequest = await request.json();
        const { text, voice, format, sampleRate, volume, speechRate, pitchRate } = body;

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Text is required',
                },
                { status: 400 }
            );
        }

        // 调用阿里云 TTS API
        const audioData = await synthesizeSpeech(text, {
            voice,
            format,
            sampleRate,
            volume,
            speechRate,
            pitchRate,
        });

        // 将 ArrayBuffer 转换为 Base64
        const base64Audio = Buffer.from(audioData).toString('base64');
        const mimeType = format === 'wav' ? 'audio/wav' : format === 'pcm' ? 'audio/pcm' : 'audio/mpeg';
        const dataUrl = `data:${mimeType};base64,${base64Audio}`;

        const response: ApiResponse<{
            audioUrl: string;
            format: string;
            size: number;
        }> = {
            success: true,
            data: {
                audioUrl: dataUrl,
                format: mimeType,
                size: audioData.byteLength,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/tts/synthesize:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
