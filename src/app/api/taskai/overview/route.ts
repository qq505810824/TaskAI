import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/overview?orgId=... */
export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const orgId = request.nextUrl.searchParams.get('orgId');
    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    try {
        const membership = await getActiveMembership(auth.userId, orgId);
        if (!membership) {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
        }

        const [{ data: org, error: orgErr }, { data: tasks, error: tasksErr }, { data: memberships, error: memErr }] =
            await Promise.all([
                supabaseAdmin
                    .from('organizations')
                    .select('id, name, points_pool_total, points_pool_remaining')
                    .eq('id', orgId)
                    .single(),
                supabaseAdmin
                    .from('tasks')
                    .select('id, status, assignee_user_id, points')
                    .eq('org_id', orgId),
                supabaseAdmin
                    .from('organization_memberships')
                    .select('user_id, role, points_balance, points_earned_total')
                    .eq('org_id', orgId)
                    .eq('status', 'active'),
            ]);

        if (orgErr) throw orgErr;
        if (tasksErr) throw tasksErr;
        if (memErr) throw memErr;

        const taskList = tasks || [];
        const memberList = memberships || [];

        const totalTasks = taskList.length;
        const openTasks = taskList.filter((t) => t.status === 'open').length;
        const inProgressTasks = taskList.filter((t) => t.status === 'in_progress').length;
        const completedTasks = taskList.filter((t) => t.status === 'completed').length;

        const myTaskList = taskList.filter((t) => t.assignee_user_id === auth.userId);
        const myInProgressTasks = myTaskList.filter((t) => t.status === 'in_progress').length;
        const myCompletedTasks = myTaskList.filter((t) => t.status === 'completed').length;

        const sortedByPoints = [...memberList].sort((a, b) => b.points_earned_total - a.points_earned_total);
        const myRank = sortedByPoints.findIndex((m) => m.user_id === auth.userId) + 1;

        return NextResponse.json({
            success: true,
            data: {
                role: membership.role,
                organization: org,
                kpi: {
                    membersCount: memberList.length,
                    totalTasks,
                    openTasks,
                    inProgressTasks,
                    completedTasks,
                    myPoints: membership.points_earned_total,
                    myBalance: membership.points_balance,
                    myRank: myRank || null,
                    myInProgressTasks,
                    myCompletedTasks,
                    pointsPoolRemaining: org.points_pool_remaining,
                },
            },
        });
    } catch (e) {
        console.error('GET /api/taskai/overview', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_overview_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
