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
                    .select('id, status, assignee_user_id, points, category')
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

        const avgPointsPerMember =
            memberList.length > 0
                ? Math.round(memberList.reduce((sum, m) => sum + (m.points_earned_total ?? 0), 0) / memberList.length)
                : 0;

        const categoryMap = new Map<
            string,
            { category: string; tasks: number; completed: number; inProgress: number; open: number; points: number }
        >();
        for (const t of taskList) {
            const category = (t.category || 'Uncategorized').trim() || 'Uncategorized';
            const row = categoryMap.get(category) ?? {
                category,
                tasks: 0,
                completed: 0,
                inProgress: 0,
                open: 0,
                points: 0,
            };
            row.tasks += 1;
            if (t.status === 'completed') {
                row.completed += 1;
                row.points += t.points ?? 0;
            } else if (t.status === 'in_progress') {
                row.inProgress += 1;
            } else {
                row.open += 1;
            }
            categoryMap.set(category, row);
        }
        const departmentContributions = [...categoryMap.values()].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.completed - a.completed;
        });

        const assigneeTaskMap = new Map<string, { completed: number; inProgress: number; open: number }>();
        for (const t of taskList) {
            if (!t.assignee_user_id) continue;
            const cur = assigneeTaskMap.get(t.assignee_user_id) ?? { completed: 0, inProgress: 0, open: 0 };
            if (t.status === 'completed') cur.completed += 1;
            else if (t.status === 'in_progress') cur.inProgress += 1;
            else cur.open += 1;
            assigneeTaskMap.set(t.assignee_user_id, cur);
        }

        const userIds = [...new Set(memberList.map((m) => m.user_id))];
        let userMap = new Map<string, { id: string; name: string | null; email: string | null; avatar_url: string | null }>();
        if (userIds.length > 0) {
            const { data: users, error: usersErr } = await supabaseAdmin
                .from('users')
                .select('id, name, email, avatar_url')
                .in('id', userIds);
            if (usersErr) throw usersErr;
            userMap = new Map((users || []).map((u) => [u.id, u]));
        }

        const staffProductivity = memberList
            .map((m) => {
                const assigneeStats = assigneeTaskMap.get(m.user_id) ?? { completed: 0, inProgress: 0, open: 0 };
                const totalAssigned = assigneeStats.completed + assigneeStats.inProgress + assigneeStats.open;
                const completionRate = totalAssigned > 0 ? Math.round((assigneeStats.completed / totalAssigned) * 100) : 0;
                const user = userMap.get(m.user_id);
                return {
                    userId: m.user_id,
                    role: m.role,
                    name: user?.name ?? user?.email ?? 'Unknown',
                    email: user?.email ?? null,
                    avatarUrl: user?.avatar_url ?? null,
                    pointsEarnedTotal: m.points_earned_total ?? 0,
                    tasksCompleted: assigneeStats.completed,
                    tasksInProgress: assigneeStats.inProgress,
                    tasksOpen: assigneeStats.open,
                    totalAssigned,
                    completionRate,
                };
            })
            .sort((a, b) => {
                if (b.pointsEarnedTotal !== a.pointsEarnedTotal) return b.pointsEarnedTotal - a.pointsEarnedTotal;
                return b.tasksCompleted - a.tasksCompleted;
            });

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
                analytics: {
                    avgPointsPerMember,
                    departmentContributions,
                    staffProductivity,
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
