import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/meets/code/[code] - 通过会议号查找会议
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    // 处理 Next.js 15+ 的异步 params
    const resolvedParams = await Promise.resolve(params);
    const code = resolvedParams.code;

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Meeting code is required',
        },
        { status: 400 }
      );
    }

    // 从 Supabase 按会议号查询（会议号在前端已转为大写，这里按精确匹配）
    const { data: meet, error } = await supabaseAdmin
      .from('meets')
      .select('id, meeting_code, title, status, join_url')
      .eq('meeting_code', code)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('Results contain 0 rows')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Meeting not found',
          },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch meet by code: ${error.message}`);
    }

    const response: ApiResponse<{
      id: string;
      meetingCode: string;
      title: string;
      status: string;
      joinUrl: string;
    }> = {
      success: true,
      data: {
        id: meet.id,
        meetingCode: meet.meeting_code,
        title: meet.title,
        status: meet.status,
        joinUrl: meet.join_url,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/meets/code/[code]:', error);
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
