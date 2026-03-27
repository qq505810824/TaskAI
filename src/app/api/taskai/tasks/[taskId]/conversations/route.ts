import { requireAuthUser } from '@/lib/taskai/api-auth';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type TaskConversationBodyRow = {
    user_message_text?: string | null;
    ai_response_text?: string | null;
    user_sent_at?: string | null;
    ai_responded_at?: string | null;
    created_at?: string | null;
};

/** GET /api/taskai/tasks/[taskId]/conversations - 获取任务对话记录 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

    try {
        const { data, error } = await supabaseAdmin
            .from('taskai_task_conversations')
            .select('id, task_id, org_id, user_id, user_message_text, ai_response_text, user_sent_at, ai_responded_at, created_at')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return NextResponse.json({ success: true, data: { conversations: data ?? [] } });
    } catch (e) {
        console.error('GET taskai conversations', e);
        return NextResponse.json(
            { success: false, error: 'taskai_fetch_task_conversations_failed', message: e instanceof Error ? e.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/** POST /api/taskai/tasks/[taskId]/conversations - 上传任务对话记录（默认覆盖） */
export async function POST(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

    let body: { conversations?: TaskConversationBodyRow[]; replace?: boolean } = {};
    try {
        body = (await request.json()) as { conversations?: TaskConversationBodyRow[]; replace?: boolean };
    } catch {
        /* */
    }

    const rows = body.conversations ?? [];
    const replace = body.replace ?? true;
    if (!Array.isArray(rows)) {
        return NextResponse.json({ success: false, message: 'conversations must be an array' }, { status: 400 });
    }

    try {
        if (replace) {
            const { error: delErr } = await supabaseAdmin.from('taskai_task_conversations').delete().eq('task_id', taskId);
            if (delErr) throw delErr;
        }

        if (rows.length === 0) {
            return NextResponse.json({ success: true, data: { saved: 0 } });
        }

        const now = new Date().toISOString();
        const insertRows = rows.map((r) => ({
            task_id: taskId,
            org_id: access.task.org_id,
            user_id: auth.userId,
            user_message_text: r.user_message_text?.trim() ?? '',
            ai_response_text: r.ai_response_text?.trim() ?? '',
            user_sent_at: r.user_sent_at ?? now,
            ai_responded_at: r.ai_responded_at ?? r.user_sent_at ?? now,
            created_at: r.created_at ?? now,
        }));

        const { data, error } = await supabaseAdmin.from('taskai_task_conversations').insert(insertRows).select('id');
        if (error) throw error;

        return NextResponse.json({ success: true, data: { saved: data?.length ?? 0 } });
    } catch (e) {
        console.error('POST taskai conversations', e);
        return NextResponse.json(
            { success: false, error: 'taskai_save_task_conversations_failed', message: e instanceof Error ? e.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
