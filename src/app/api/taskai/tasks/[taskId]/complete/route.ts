import { createSupabaseForAccessToken, requireAuthUser } from '@/lib/taskai/api-auth';
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
