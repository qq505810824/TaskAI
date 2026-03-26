import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Todo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/my/todos?userId=xxx&title=&status=&priority=&meetingCode=
// 获取当前用户的所有 Todo（按 owner_user_id 或 assignee_id），支持标题、状态、优先级和会议号筛选
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const title = searchParams.get('title');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const meetingCodeRaw = searchParams.get('meetingCode');

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'userId is required',
                },
                { status: 400 }
            );
        }

        let query = supabaseAdmin
            .from('todos')
            .select(
                `
                *,
                meet:meets (
                    id,
                    meeting_code,
                    title,
                    status
                )
            `
            )
            .or(`owner_user_id.eq.${userId},assignee_id.eq.${userId}`);

        // 按任务标题模糊搜索
        if (title && title.trim()) {
            query = query.ilike('title', `%${title.trim()}%`);
        }

        // 按任务状态筛选
        if (status && status.trim()) {
            query = query.eq('status', status.trim());
        }

        // 按优先级筛选
        if (priority && priority.trim()) {
            query = query.eq('priority', priority.trim());
        }

        // 按会议号筛选（会议号为 9 位数字，数据库中为纯数字字符串）
        if (meetingCodeRaw && meetingCodeRaw.trim()) {
            const meetingCodeDigits = meetingCodeRaw.replace(/\D/g, '');

            if (meetingCodeDigits.length > 0) {
                const { data: meets, error: meetError } = await supabaseAdmin
                    .from('meets')
                    .select('id, meeting_code')
                    .eq('meeting_code', meetingCodeDigits);

                if (meetError) {
                    throw new Error(`Failed to fetch meets for meetingCode filter: ${meetError.message}`);
                }

                const meetIds = (meets || []).map((m) => m.id);

                if (meetIds.length === 0) {
                    const emptyResponse: ApiResponse<{
                        todos: Array<
                            Todo & {
                                meet?: {
                                    id: string;
                                    meeting_code: string;
                                    title: string;
                                    status: string;
                                } | null;
                            }
                        >;
                    }> = {
                        success: true,
                        data: {
                            todos: [],
                        },
                    };
                    return NextResponse.json(emptyResponse);
                }

                query = query.in('meet_id', meetIds);
            }
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch my todos: ${error.message}`);
        }

        const response: ApiResponse<{
            todos: Array<
                Todo & {
                    meet?: {
                        id: string;
                        meeting_code: string;
                        title: string;
                        status: string;
                    } | null;
                }
            >;
        }> = {
            success: true,
            data: {
                todos: (data || []) as any,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/my/todos:', error);
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

