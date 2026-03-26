import { mockSummaries, mockTodos } from '@/lib/mock-data';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, MeetSummary, Todo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/todos/generate - 生成会议总结和任务
export async function POST(request: NextRequest) {
    try {

        const body = await request.json();
        const { meetId, userId, userMeetId } = body as { meetId: string; userId?: string; userMeetId?: string };

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

        // 从 Supabase 获取该会议/用户会议实例的所有对话
        const convQuery = supabaseAdmin
            .from('conversations')
            .select('*')
            .order('created_at', { ascending: true });

        const { data: conversations, error: convError } = userMeetId
            ? await convQuery.eq('user_meet_id', userMeetId)
            : await convQuery.eq('meet_id', meetId);

        if (convError) {
            console.warn('Failed to fetch conversations:', convError.message);
        }

        const conversationCount = conversations?.length || 0;

        // 从 mock 数据中随机选择一个 summary 模板（后续会对接真实的 LLM API）
        const randomSummaryIndex = Math.floor(Math.random() * mockSummaries.length);
        const mockSummaryTemplate = mockSummaries[randomSummaryIndex];

        // 生成会议总结（基于对话数量调整）
        const summaryText = `本次会议进行了${conversationCount}轮对话。${mockSummaryTemplate.summary}`;

        // 从 mock todos 中随机选择 2-4 个作为模板（后续会对接真实的 LLM API）
        const todoCount = Math.min(2 + Math.floor(Math.random() * 3), mockTodos.length);
        const shuffledTodos = [...mockTodos].sort(() => Math.random() - 0.5);
        const selectedTodoTemplates = shuffledTodos.slice(0, todoCount);

        const now = new Date().toISOString();

        // 生成 todos（基于模板）
        // 注意：不生成临时 ID，让数据库自动生成 UUID
        const todoDataToInsert = selectedTodoTemplates.map((template, index) => ({
            meet_id: meetId,
            user_meet_id: userMeetId || null,
            owner_user_id: userId || null,
            title: template.title,
            description: template.description,
            assignee_id: userId || null,
            status: 'draft' as const,
            priority: template.priority,
            due_date: new Date(Date.now() + (30 + index * 15) * 24 * 60 * 60 * 1000).toISOString(),
            reminder_time: null,
            source: 'ai_generated' as const,
            created_at: now,
            updated_at: now,
            completed_at: null,
        }));

        // 保存 todos 到 Supabase
        // 注意：不传递 id 字段，让 Supabase 自动生成 UUID
        let savedTodos: Todo[] = [];
        if (todoDataToInsert.length > 0) {
            const { data: insertedTodos, error: todoError } = await supabaseAdmin
                .from('todos')
                .insert(todoDataToInsert)
                .select();

            if (todoError) {
                console.error('Failed to save todos:', todoError);
                throw new Error(`Failed to save todos: ${todoError.message}`);
            }

            // 使用数据库返回的 UUID
            savedTodos = (insertedTodos || []) as Todo[];
        }

        // 保存 summary 到 Supabase
        // 对于带 userMeetId 的新流程：每个用户会议实例一条总结记录
        let savedSummary: MeetSummary;
        if (userMeetId) {
            const { data, error: summaryError } = await supabaseAdmin
                .from('meet_summaries')
                .insert({
                    meet_id: meetId,
                    user_meet_id: userMeetId,
                    summary: summaryText,
                    key_points: mockSummaryTemplate.key_points,
                    participants: [],
                    generated_at: now,
                })
                .select()
                .single();

            if (summaryError) {
                console.error('Failed to save summary:', summaryError);
                throw new Error(`Failed to save summary: ${summaryError.message}`);
            }

            savedSummary = data as MeetSummary;
        } else {
            // 兼容旧流程：按 meet_id upsert 一条全局总结
            const { data, error: summaryError } = await supabaseAdmin
                .from('meet_summaries')
                .upsert(
                    {
                        meet_id: meetId,
                        summary: summaryText,
                        key_points: mockSummaryTemplate.key_points,
                        participants: [],
                        generated_at: now,
                    },
                    { onConflict: 'meet_id' }
                )
                .select()
                .single();

            if (summaryError) {
                console.error('Failed to save summary:', summaryError);
                throw new Error(`Failed to save summary: ${summaryError.message}`);
            }

            savedSummary = data as MeetSummary;
        }

        // 如果提供了 userMeetId，则标记该用户会议实例已完成
        if (userMeetId) {
            const { error: updateUserMeetError } = await supabaseAdmin
                .from('user_meets')
                .update({
                    status: 'completed',
                    completed_at: now,
                })
                .eq('id', userMeetId);

            if (updateUserMeetError) {
                console.warn('Failed to update user_meets status:', updateUserMeetError.message);
            }
        }

        const response: ApiResponse<{
            todos: Todo[];
            summary: MeetSummary;
        }> = {
            success: true,
            data: {
                todos: savedTodos,
                summary: savedSummary,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/todos/generate:', error);
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
