import { NextRequest, NextResponse } from 'next/server';
import { generateId, delay } from '@/lib/mock-data';
import type { ApiResponse, TTSGenerateRequest } from '@/types/meeting';

// POST /api/tts/generate - 生成语音
export async function POST(request: NextRequest) {
  try {
    await delay(2000); // 模拟TTS生成时间

    const body: TTSGenerateRequest = await request.json();
    const { text, voice, language } = body;

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Text is required',
        },
        { status: 400 }
      );
    }

    // 模拟生成语音文件（实际应该调用TTS API）
    const audioUrl = `https://storage.example.com/audio-responses/ai-resp-${generateId()}.mp3`;
    const duration = Math.ceil(text.length / 10); // 粗略估算：每10个字符1秒

    const response: ApiResponse<{
      audioUrl: string;
      duration: number;
      provider: string;
    }> = {
      success: true,
      data: {
        audioUrl,
        duration,
        provider: 'openai',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
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
