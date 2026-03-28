import { createSupabaseForAccessToken, requireAuthUser } from '@/lib/taskai/api-auth';
import { cancelPendingNotificationJobs, enqueueTaskCompletedNotification } from '@/lib/taskai/notifications';
import { publicOriginFromRequest } from '@/lib/taskai/public-origin';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** POST /api/taskai/tasks/[taskId]/complete — 执行数据库 RPC complete_task（依赖 auth.uid()） */
export async function POST(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });
    }

    try {
        const { data: task, error: taskError } = await supabaseAdmin
            .from('tasks')
            .select('id, org_id, title, points, type')
            .eq('id', taskId)
            .maybeSingle()

        if (taskError) throw taskError
        if (!task) {
            return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })
        }

        const sb = createSupabaseForAccessToken(auth.accessToken);
        const { error } = await sb.rpc('complete_task', { _task_id: taskId });

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'complete_failed',
                    message: error.message,
                },
                { status: 400 }
            );
        }

        await cancelPendingNotificationJobs({
            userId: auth.userId,
            taskId,
            eventTypes: ['task_claimed_no_ai_started', 'task_claimed_stalled'],
        })

        const { data: completedTask, error: completedTaskError } = await supabaseAdmin
            .from('tasks')
            .select('id, status, last_completed_at, updated_at')
            .eq('id', taskId)
            .maybeSingle()

        if (completedTaskError) throw completedTaskError
        if (!completedTask) {
            return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })
        }

        const completionKey =
            completedTask.last_completed_at ??
            completedTask.updated_at ??
            new Date().toISOString()

        await enqueueTaskCompletedNotification({
            orgId: task.org_id as string,
            userId: auth.userId,
            taskId,
            title: task.title as string,
            points: Number(task.points ?? 0),
            origin: publicOriginFromRequest(request),
            completionKey: String(completionKey),
        })

        return NextResponse.json({ success: true, data: { ok: true } });
    } catch (e) {
        console.error('POST complete', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_complete_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
