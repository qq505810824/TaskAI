import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership, memberCanSeeTask } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import type { TaskaiTaskType } from '@/types/taskai';
import { NextRequest, NextResponse } from 'next/server';

async function attachAssigneeNames(tasks: Record<string, unknown>[]) {
    const ids = [...new Set(tasks.map((t) => t.assignee_user_id).filter(Boolean))] as string[];
    if (!ids.length) return tasks;

    const { data: users, error } = await supabaseAdmin.from('users').select('id, name').in('id', ids);
    if (error) throw error;
    const map = new Map((users || []).map((u) => [u.id, u.name]));

    return tasks.map((t) => ({
        ...t,
        assignee_display_name: t.assignee_user_id ? map.get(t.assignee_user_id as string) ?? null : null,
    }));
}

/** GET /api/taskai/orgs/[orgId]/tasks */
export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { orgId } = await ctx.params;
    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    try {
        const membership = await getActiveMembership(auth.userId, orgId);
        if (!membership) {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
        }

        const { data: rawTasks, error } = await supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('org_id', orgId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        let tasks = (rawTasks || []) as Record<string, unknown>[];
        if (membership.role === 'member') {
            const visible: Record<string, unknown>[] = [];
            for (const t of tasks) {
                const ok = await memberCanSeeTask(auth.userId, orgId, t.id as string);
                if (ok) visible.push(t);
            }
            tasks = visible;
        }

        const enriched = await attachAssigneeNames(tasks);

        return NextResponse.json({ success: true, data: { tasks: enriched } });
    } catch (e) {
        console.error('GET /api/taskai/orgs/[orgId]/tasks', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_tasks_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

type CreateTaskBody = {
    title?: string;
    description?: string | null;
    points?: number;
    type?: TaskaiTaskType;
    recurring_frequency?: 'daily' | 'weekly' | 'monthly' | null;
    goal_id?: string | null;
    category?: string | null;
    visible_group_ids?: string[];
};

/** POST /api/taskai/orgs/[orgId]/tasks — Owner 创建任务 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { orgId } = await ctx.params;
    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    const membership = await getActiveMembership(auth.userId, orgId);
    if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    let body: CreateTaskBody = {};
    try {
        body = (await request.json()) as CreateTaskBody;
    } catch {
        /* */
    }

    const title = body.title?.trim();
    const points = body.points;
    const type = body.type ?? 'one_time';

    if (!title || points == null || Number.isNaN(Number(points)) || Number(points) <= 0) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'title and positive points required' },
            { status: 400 }
        );
    }

    if (type === 'recurring' && !body.recurring_frequency) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'recurring_frequency required for recurring tasks' },
            { status: 400 }
        );
    }

    if (type === 'one_time' && body.recurring_frequency) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'recurring_frequency must be null for one_time' },
            { status: 400 }
        );
    }

    const now = new Date().toISOString();

    try {
        const { data: task, error } = await supabaseAdmin
            .from('tasks')
            .insert({
                org_id: orgId,
                goal_id: body.goal_id ?? null,
                title,
                description: body.description ?? null,
                points: Math.floor(Number(points)),
                type,
                recurring_frequency: type === 'recurring' ? body.recurring_frequency : null,
                status: 'open',
                category: body.category ?? null,
                assignee_user_id: null,
                created_by: auth.userId,
                created_at: now,
                updated_at: now,
            })
            .select('*')
            .single();

        if (error) throw error;

        const groupIds = body.visible_group_ids?.filter(Boolean) ?? [];
        if (groupIds.length && task) {
            const rows = groupIds.map((gid) => ({
                task_id: task.id,
                group_id: gid,
                org_id: orgId,
                created_at: now,
            }));
            const { error: vErr } = await supabaseAdmin.from('task_visible_groups').insert(rows);
            if (vErr) throw vErr;
        }

        return NextResponse.json({ success: true, data: { task } }, { status: 201 });
    } catch (e) {
        console.error('POST /api/taskai/orgs/[orgId]/tasks', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_create_task_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
