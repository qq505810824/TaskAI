import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthUser } from '@/lib/taskai/api-auth';
import { generateTaskSummaryFromConversations } from '@/lib/taskai/generate-task-summary-llm';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { NextRequest, NextResponse } from 'next/server';

/** POST /api/taskai/tasks/generate-llm - 为 task 生成 summary（不生成 todos） */
export async function POST(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    let body: {
        taskId?: string;
        language?: 'zh' | 'en';
        conversations?: Array<{ user_message_text?: string | null; ai_response_text?: string | null }>;
    } = {};
    try {
        body = (await request.json()) as {
            taskId?: string;
            language?: 'zh' | 'en';
            conversations?: Array<{ user_message_text?: string | null; ai_response_text?: string | null }>;
        };
    } catch {
        /* */
    }

    const taskId = body.taskId?.trim();
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });
    }

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

    try {
        let rows = Array.isArray(body.conversations)
            ? body.conversations.map((r) => ({
                  user_message_text: r.user_message_text ?? '',
                  ai_response_text: r.ai_response_text ?? '',
              }))
            : [];

        // 兼容：若未传本地会话，退回数据库读取
        if (rows.length === 0) {
            const { data: conversations, error: convErr } = await supabaseAdmin
                .from('taskai_task_conversations')
                .select('user_message_text, ai_response_text')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });
            if (convErr) throw convErr;
            rows = (conversations ?? []).map((r) => ({
                user_message_text: r.user_message_text ?? '',
                ai_response_text: r.ai_response_text ?? '',
            }));
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No conversations found for this task' },
                { status: 400 }
            );
        }

        const llm = await generateTaskSummaryFromConversations({
            taskTitle: access.task.title,
            taskDescription: access.task.description,
            rows,
            language: body.language ?? 'en',
        });

        const now = new Date().toISOString();
        const { data: saved, error: saveErr } = await supabaseAdmin
            .from('taskai_task_summaries')
            .upsert(
                {
                    task_id: taskId,
                    org_id: access.task.org_id,
                    generated_by: auth.userId,
                    summary: llm.summary,
                    key_points: llm.key_points,
                    generated_at: now,
                    updated_at: now,
                },
                { onConflict: 'task_id' }
            )
            .select('id, task_id, org_id, generated_by, summary, key_points, generated_at, updated_at')
            .single();
        if (saveErr) throw saveErr;

        return NextResponse.json({ success: true, data: { summary: saved } });
    } catch (e) {
        console.error('POST /api/taskai/tasks/generate-llm', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_generate_summary_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
