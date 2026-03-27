import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import type { TaskaiTaskType } from '@/types/taskai';
import { NextRequest, NextResponse } from 'next/server';

type PatchTaskBody = {
    title?: string;
    description?: string | null;
    points?: number;
    type?: TaskaiTaskType;
    recurring_frequency?: 'daily' | 'weekly' | 'monthly' | null;
    category?: string | null;
};

async function loadTaskForOwner(taskId: string, userId: string) {
    const { data: task, error } = await supabaseAdmin
        .from('tasks')
        .select('id, org_id, status')
        .eq('id', taskId)
        .maybeSingle();

    if (error) throw error;
    if (!task) return { error: NextResponse.json({ success: false, error: 'not_found' }, { status: 404 }) };

    const membership = await getActiveMembership(userId, task.org_id as string);
    if (!membership || membership.role !== 'owner') {
        return { error: NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) };
    }

    if (task.status !== 'open') {
        return {
            error: NextResponse.json(
                { success: false, error: 'validation', message: 'Only open tasks can be modified' },
                { status: 400 }
            ),
        };
    }

    return { task };
}

/** PATCH /api/taskai/tasks/[taskId] — Owner，仅 open */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });
    }

    let body: PatchTaskBody = {};
    try {
        body = (await request.json()) as PatchTaskBody;
    } catch {
        /* */
    }

    try {
        const loaded = await loadTaskForOwner(taskId, auth.userId);
        if ('error' in loaded && loaded.error) return loaded.error;

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (body.title !== undefined) {
            const t = body.title.trim();
            if (!t) {
                return NextResponse.json(
                    { success: false, error: 'validation', message: 'title cannot be empty' },
                    { status: 400 }
                );
            }
            patch.title = t;
        }

        if (body.description !== undefined) patch.description = body.description;

        if (body.points !== undefined) {
            const p = Math.floor(Number(body.points));
            if (Number.isNaN(p) || p <= 0) {
                return NextResponse.json(
                    { success: false, error: 'validation', message: 'points must be positive' },
                    { status: 400 }
                );
            }
            patch.points = p;
        }

        if (body.category !== undefined) patch.category = body.category;

        if (body.type !== undefined) {
            patch.type = body.type;
            if (body.type === 'recurring') {
                const freq = body.recurring_frequency;
                if (!freq) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'validation',
                            message: 'recurring_frequency required for recurring tasks',
                        },
                        { status: 400 }
                    );
                }
                patch.recurring_frequency = freq;
            } else {
                patch.recurring_frequency = null;
            }
        } else if (body.recurring_frequency !== undefined) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'validation',
                    message: 'type must be sent when updating recurring_frequency',
                },
                { status: 400 }
            );
        }

        if (Object.keys(patch).length <= 1) {
            return NextResponse.json(
                { success: false, error: 'validation', message: 'no fields to update' },
                { status: 400 }
            );
        }

        const { data: updated, error: upErr } = await supabaseAdmin
            .from('tasks')
            .update(patch)
            .eq('id', taskId)
            .eq('status', 'open')
            .select('*')
            .single();

        if (upErr) throw upErr;

        return NextResponse.json({ success: true, data: { task: updated } });
    } catch (e) {
        console.error('PATCH /api/taskai/tasks/[taskId]', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_update_task_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/** DELETE /api/taskai/tasks/[taskId] — Owner，仅 open */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });
    }

    try {
        const loaded = await loadTaskForOwner(taskId, auth.userId);
        if ('error' in loaded && loaded.error) return loaded.error;

        const { error: delErr } = await supabaseAdmin.from('tasks').delete().eq('id', taskId).eq('status', 'open');

        if (delErr) throw delErr;

        return NextResponse.json({ success: true, data: { deleted: true } });
    } catch (e) {
        console.error('DELETE /api/taskai/tasks/[taskId]', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_delete_task_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
