import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Conversation } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/conversations/batch - 批量保存对话记录
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { conversations } = body as { conversations: Conversation[] };

        if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'conversations array is required',
                },
                { status: 400 }
            );
        }

        // 批量插入对话记录
        // 注意：不传递 id 字段，让 Supabase 自动生成 UUID
        // 使用解构明确排除 id 字段，确保不会意外传递无效的 UUID
        const dataToInsert = conversations.map((conv) => {
            // 解构排除 id 字段，确保不传递无效的 UUID
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, ...rest } = conv;

            // 构建插入对象，明确不包含 id 字段
            const insertData = {
                meet_id: rest.meet_id,
                user_id: rest.user_id,
                user_meet_id: rest.user_meet_id ?? null,
                // user_audio_url 在数据库中是 NOT NULL：空字符串也允许写入
                user_audio_url: rest.user_audio_url ?? '',
                user_message_text: rest.user_message_text,
                user_audio_duration: rest.user_audio_duration ?? null,
                ai_response_text: rest.ai_response_text,
                // 新策略：不再持久化 AI 音频文件 URL
                ai_audio_url: null,
                ai_audio_duration: rest.ai_audio_duration ?? null,
                user_sent_at: rest.user_sent_at,
                ai_responded_at: rest.ai_responded_at,
                created_at: rest.created_at || new Date().toISOString(),
            };

            // 确保不包含 id 字段（双重保险）
            return insertData;
        });

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert(dataToInsert)
            .select();

        if (error) {
            throw new Error(`Failed to save conversations: ${error.message}`);
        }

        const response: ApiResponse<{
            saved: number;
            conversations: Conversation[];
        }> = {
            success: true,
            data: {
                saved: data?.length || 0,
                conversations: (data || []) as Conversation[],
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/conversations/batch:', error);
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
