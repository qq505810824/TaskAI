import { NextRequest, NextResponse } from 'next/server';
import { mockConversations, mockSummaries, delay } from '@/lib/mock-data';
import type { ApiResponse } from '@/types/meeting';

// POST /api/llm/summarize - 生成会议总结和任务
export async function POST(request: NextRequest) {
  try {
    await delay(3000); // 模拟LLM处理时间

    const body = await request.json();
    const { meetId } = body;

    if (!meetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'meetId is required',
        },
        { status: 400 }
      );
    }

    // 获取该会议的所有对话
    const conversations = mockConversations.filter(c => c.meet_id === meetId);

    // 查找或生成总结（实际应该调用OpenAI API）
    let summary = mockSummaries.find(s => s.meet_id === meetId);

    if (!summary) {
      // 生成新总结
      summary = {
        id: `summary-${meetId}`,
        meet_id: meetId,
        summary: `本次会议进行了${conversations.length}轮对话，讨论了多个重要议题。`,
        key_points: [
          {
            point: '会议主题',
            detail: '讨论了项目规划和任务分配',
          },
        ],
        participants: [],
        generated_at: new Date().toISOString(),
      };
    }

    // 生成任务（简化版，实际应该从对话中提取）
    const todos = [
      {
        title: '跟进会议讨论的事项',
        description: '根据会议内容执行相关任务',
        assignee: null,
        dueDate: null,
        priority: 'medium' as const,
      },
    ];

    const response: ApiResponse<{
      summary: string;
      keyPoints: Array<{ point: string; detail: string }>;
      todos: Array<{
        title: string;
        description: string;
        assignee?: string | null;
        dueDate?: string | null;
        priority: 'low' | 'medium' | 'high';
      }>;
    }> = {
      success: true,
      data: {
        summary: summary.summary,
        keyPoints: summary.key_points,
        todos,
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
