import { requireAuthUser } from '@/lib/taskai/api-auth'
import { cancelPendingNotificationJobs } from '@/lib/taskai/notifications'
import { requireTaskAccess } from '@/lib/taskai/task-access'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request)
    if (!auth.ok) return auth.response

    const { taskId } = await ctx.params
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 })
    }

    const access = await requireTaskAccess(auth.userId, taskId)
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status })

    try {
        await cancelPendingNotificationJobs({
            userId: auth.userId,
            taskId,
            eventTypes: ['task_claimed_no_ai_started'],
        })

        return NextResponse.json({ success: true, data: { ok: true } })
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_workspace_start_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
