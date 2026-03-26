import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Meet } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/my/meet-summary?userMeetId=xxx - 按 user_meet_id 获取个人会议结果（对话 + todo + 总结）
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userMeetId = searchParams.get('userMeetId');

        if (!userMeetId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'userMeetId is required',
                },
                { status: 400 }
            );
        }

        // 查 user_meets 和关联的 meet
        const { data: userMeet, error: userMeetError } = await supabaseAdmin
            .from('user_meets')
            .select(
                `
                id,
                meet_id,
                user_id,
                status,
                joined_at,
                completed_at,
                meet:meets (
                    id,
                    meeting_code,
                    title,
                    description,
                    status
                )
            `
            )
            .eq('id', userMeetId)
            .maybeSingle();

        if (userMeetError) {
            throw new Error(`Failed to fetch user_meets: ${userMeetError.message}`);
        }

        if (!userMeet) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Not found',
                    message: 'User meet not found',
                },
                { status: 404 }
            );
        }

        const meetId = userMeet.meet_id as string;

        // 查询该 user_meet_id 下的对话、todo 和总结
        const [
            { data: conversations, error: convError },
            { data: todos, error: todoError },
            { data: summary, error: summaryError },
        ] = await Promise.all([
            supabaseAdmin
                .from('conversations')
                .select(
                    [
                        'id',
                        'meet_id',
                        'user_id',
                        'user_meet_id',
                        'user_message_text',
                        'user_audio_url',
                        'user_audio_duration',
                        'ai_response_text',
                        'ai_audio_duration',
                        'user_sent_at',
                        'ai_responded_at',
                        'created_at',
                    ].join(',')
                )
                .eq('user_meet_id', userMeetId)
                .order('created_at', { ascending: true }),
            supabaseAdmin
                .from('todos')
                .select('*')
                .eq('user_meet_id', userMeetId)
                .order('created_at', { ascending: false }),
            supabaseAdmin.from('meet_summaries').select('*').eq('user_meet_id', userMeetId).maybeSingle(),
        ]);

        if (convError) {
            console.warn('Failed to fetch conversations for user_meet:', userMeetId, convError.message);
        }
        if (todoError) {
            console.warn('Failed to fetch todos for user_meet:', userMeetId, todoError.message);
        }
        if (summaryError) {
            console.warn('Failed to fetch summary for user_meet:', userMeetId, summaryError.message);
        }

        const response: ApiResponse<{
            userMeet: typeof userMeet;
            meet: Pick<Meet, 'id' | 'meeting_code' | 'title' | 'description' | 'status'> | null;
            conversations: any[];
            todos: any[];
            summary: any | null;
        }> = {
            success: true,
            data: {
                userMeet,
                meet: (userMeet.meet || null) as any,
                conversations: conversations || [],
                todos: todos || [],
                summary: summary || null,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/my/meet-summary:', error);
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

