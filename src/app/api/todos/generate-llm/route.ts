import {
    buildTranscriptFromConversations,
    generateSummaryAndTodosFromTranscript,
} from '@/lib/meeting/generate-summary-todos-llm';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, MeetSummary, Todo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/todos/generate-llm
 * 根据已落库的 conversations 调用 ARK LLM 生成 summary 与 todos 并写入数据库。
 * 需配置 ARK_API_KEY、ARK_MODEL_ID（与 respond-stream-ark 相同）。
 *
 * Body: { meetId: string; userId?: string; userMeetId?: string; language?: string; maxTodos?: number }
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            meetId,
            userId,
            userMeetId,
            language = 'en',
            maxTodos = 5,
        } = body as {
            meetId?: string;
            userId?: string;
            userMeetId?: string;
            language?: string;
            maxTodos?: number;
        };

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

        // 幂等：同一用户会议实例或旧版「整会一条总结」已生成过则直接返回，避免重复插入 todos/summary
        if (userMeetId) {
            const { data: existingByUserMeet, error: existErr } = await supabaseAdmin
                .from('meet_summaries')
                .select('*')
                .eq('user_meet_id', userMeetId)
                .maybeSingle();

            if (existErr) {
                console.warn('meet_summaries lookup by user_meet_id:', existErr.message);
            }

            if (existingByUserMeet) {
                const { data: existingTodos } = await supabaseAdmin
                    .from('todos')
                    .select('*')
                    .eq('user_meet_id', userMeetId)
                    .order('created_at', { ascending: true });

                const response: ApiResponse<{
                    todos: Todo[];
                    summary: MeetSummary;
                    alreadyGenerated?: boolean;
                }> = {
                    success: true,
                    data: {
                        todos: (existingTodos ?? []) as Todo[],
                        summary: existingByUserMeet as MeetSummary,
                        alreadyGenerated: true,
                    },
                };
                return NextResponse.json(response);
            }
        } else {
            const { data: existingLegacy, error: legacyErr } = await supabaseAdmin
                .from('meet_summaries')
                .select('*')
                .eq('meet_id', meetId)
                .is('user_meet_id', null)
                .maybeSingle();

            if (legacyErr) {
                console.warn('meet_summaries legacy lookup:', legacyErr.message);
            }

            if (existingLegacy) {
                const { data: legacyTodos } = await supabaseAdmin
                    .from('todos')
                    .select('*')
                    .eq('meet_id', meetId)
                    .is('user_meet_id', null)
                    .order('created_at', { ascending: true });

                const response: ApiResponse<{
                    todos: Todo[];
                    summary: MeetSummary;
                    alreadyGenerated?: boolean;
                }> = {
                    success: true,
                    data: {
                        todos: (legacyTodos ?? []) as Todo[],
                        summary: existingLegacy as MeetSummary,
                        alreadyGenerated: true,
                    },
                };
                return NextResponse.json(response);
            }
        }

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

        const rows = conversations ?? [];
        if (rows.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'No conversations found for this meeting; save conversations before generating summary.',
                },
                { status: 400 }
            );
        }

        const transcript = buildTranscriptFromConversations(rows);
        if (!transcript.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Conversation text is empty; nothing to summarize.',
                },
                { status: 400 }
            );
        }

        const { data: meetRow, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('title, description')
            .eq('id', meetId)
            .maybeSingle();

        if (meetError) {
            console.warn('Failed to fetch meet:', meetError.message);
        }

        const meetTitle = (meetRow?.title as string | undefined)?.trim() || '会议';
        const meetDescription = (meetRow?.description as string | null | undefined) ?? null;

        let llmResult;
        try {
            llmResult = await generateSummaryAndTodosFromTranscript({
                meetTitle,
                meetDescription,
                transcript,
                language,
                maxTodos,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const isConfig = msg.includes('ARK_API_KEY') || msg.includes('ARK_MODEL_ID');
            console.error('LLM summary generation failed:', msg);
            return NextResponse.json(
                {
                    success: false,
                    error: isConfig ? 'Service unavailable' : 'LLM error',
                    message: msg,
                },
                { status: isConfig ? 503 : 502 }
            );
        }

        const now = new Date().toISOString();

        const todoDataToInsert = llmResult.todos.map((template, index) => ({
            meet_id: meetId,
            user_meet_id: userMeetId || null,
            owner_user_id: userId || null,
            title: template.title,
            description: template.description?.trim() ? template.description : null,
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

            savedTodos = (insertedTodos || []) as Todo[];
        }

        let savedSummary: MeetSummary;
        if (userMeetId) {
            const { data, error: summaryError } = await supabaseAdmin
                .from('meet_summaries')
                .insert({
                    meet_id: meetId,
                    user_meet_id: userMeetId,
                    summary: llmResult.summary,
                    key_points: llmResult.key_points,
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
            const { data, error: summaryError } = await supabaseAdmin
                .from('meet_summaries')
                .upsert(
                    {
                        meet_id: meetId,
                        summary: llmResult.summary,
                        key_points: llmResult.key_points,
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
        console.error('Error in POST /api/todos/generate-llm:', error);
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
