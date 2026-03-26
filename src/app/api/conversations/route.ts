import { NextRequest, NextResponse } from 'next/server';
import { mockConversations, delay } from '@/lib/mock-data';
import type { ApiResponse } from '@/types/meeting';

// GET /api/conversations - 获取对话记录
export async function GET(request: NextRequest) {
  try {
    await delay(300);

    const searchParams = request.nextUrl.searchParams;
    const meetId = searchParams.get('meetId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let filteredConversations = [...mockConversations];

    if (meetId) {
      filteredConversations = filteredConversations.filter(c => c.meet_id === meetId);
    }

    // 按时间排序
    filteredConversations.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // 分页
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedConversations = filteredConversations.slice(start, end);

    const response: ApiResponse<{
      conversations: typeof mockConversations;
      total: number;
    }> = {
      success: true,
      data: {
        conversations: paginatedConversations,
        total: filteredConversations.length,
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
