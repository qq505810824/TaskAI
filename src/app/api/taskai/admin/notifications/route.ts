import { requireAuthUser } from '@/lib/taskai/api-auth'
import { getActiveMembership } from '@/lib/taskai/permissions'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request)
    if (!auth.ok) return auth.response

    const orgId = request.nextUrl.searchParams.get('orgId')
    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 })
    }

    try {
        const membership = await getActiveMembership(auth.userId, orgId)
        if (!membership || membership.role !== 'owner') {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 })
        }

        const { data: jobs, error } = await supabaseAdmin
            .from('taskai_notification_jobs')
            .select('*')
            .eq('org_id', orgId)
            .eq('channel', 'whatsapp')
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) throw error

        const userIds = [...new Set((jobs ?? []).map((j) => j.user_id).filter(Boolean))]
        const taskIds = [...new Set((jobs ?? []).map((j) => j.task_id).filter(Boolean))]

        const [{ data: users, error: uErr }, { data: tasks, error: tErr }] = await Promise.all([
            userIds.length
                ? supabaseAdmin.from('users').select('id, name, email').in('id', userIds)
                : Promise.resolve({ data: [], error: null }),
            taskIds.length
                ? supabaseAdmin.from('tasks').select('id, title').in('id', taskIds)
                : Promise.resolve({ data: [], error: null }),
        ])
        if (uErr) throw uErr
        if (tErr) throw tErr

        const userMap = new Map((users ?? []).map((u) => [u.id, u]))
        const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]))

        return NextResponse.json({
            success: true,
            data: {
                jobs: (jobs ?? []).map((job) => ({
                    ...job,
                    user: userMap.get(job.user_id) ?? null,
                    task: job.task_id ? taskMap.get(job.task_id) ?? null : null,
                })),
            },
        })
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_admin_notifications_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
