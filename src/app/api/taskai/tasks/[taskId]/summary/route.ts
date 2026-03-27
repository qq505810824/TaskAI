import { requireAuthUser } from '@/lib/taskai/api-auth';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/tasks/[taskId]/summary - 根据 taskId 获取 summary */
export async function GET(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

    try {
        const { data, error } = await supabaseAdmin
            .from('taskai_task_summaries')
            .select('id, task_id, org_id, generated_by, summary, key_points, generated_at, updated_at')
            .eq('task_id', taskId)
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data: { summary: data ?? null } });
    } catch (e) {
        console.error('GET task summary', e);
        return NextResponse.json(
            { success: false, error: 'taskai_fetch_summary_failed', message: e instanceof Error ? e.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
