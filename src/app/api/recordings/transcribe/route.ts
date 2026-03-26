import { NextRequest, NextResponse } from 'next/server';
import { generateId, delay } from '@/lib/mock-data';
import type { ApiResponse } from '@/types/meeting';

// POST /api/recordings/transcribe - 上传录音并转文字
export async function POST(request: NextRequest) {
  try {
    await delay(3000); // 模拟转文字处理时间

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const meetId = formData.get('meetId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !meetId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // 模拟转文字结果（实际应该调用Whisper API）
    const mockTranscriptions = [
      '我们需要在Q1发布新版本',
      '主要功能包括用户认证、数据分析和报表生成',
      '用户认证优先级最高，其次是数据分析，最后是报表生成',
      '好的，我明白了',
      '还有其他需要讨论的内容吗？',
    ];
    const randomText = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];

    // 模拟文件上传（实际应该上传到Supabase Storage）
    const fileUrl = `https://storage.example.com/recordings/user-rec-${generateId()}.mp3`;
    const duration = Math.floor(Math.random() * 10) + 3; // 3-12秒

    const response: ApiResponse<{
      recordingId: string;
      transcriptionId: string;
      text: string;
      language: string;
      duration: number;
    }> = {
      success: true,
      data: {
        recordingId: generateId(),
        transcriptionId: generateId(),
        text: randomText,
        language: 'zh-TW',
        duration,
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
