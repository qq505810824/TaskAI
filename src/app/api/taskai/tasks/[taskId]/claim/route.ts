import { requireAuthUser } from '@/lib/taskai/api-auth';
import { enqueueClaimReminderNotifications } from '@/lib/taskai/notifications';
import { getActiveMembership, memberCanSeeTask } from '@/lib/taskai/permissions';
import { publicOriginFromRequest } from '@/lib/taskai/public-origin';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** POST /api/taskai/tasks/[taskId]/claim */
export async function POST(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });
    }

    try {
        const { data: task, error: tErr } = await supabaseAdmin.from('tasks').select('*').eq('id', taskId).single();
        if (tErr || !task) {
            return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
        }

        const orgId = task.org_id as string;
        const membership = await getActiveMembership(auth.userId, orgId);
        if (!membership) {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
        }

        if (membership.role === 'member') {
            const canSee = await memberCanSeeTask(auth.userId, orgId, taskId);
            if (!canSee) {
                return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
            }
        }

        if (task.status !== 'open') {
            return NextResponse.json(
                { success: false, error: 'invalid_state', message: 'Task is not open' },
                { status: 409 }
            );
        }

        if (task.assignee_user_id && task.assignee_user_id !== auth.userId) {
            return NextResponse.json(
                { success: false, error: 'already_claimed', message: 'Task already claimed' },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();

        const { data: claimedTask, error: uErr } = await supabaseAdmin
            .from('tasks')
            .update({
                assignee_user_id: auth.userId,
                status: 'in_progress',
                last_claimed_at: now,
                updated_at: now,
            })
            .eq('id', taskId)
            .eq('status', 'open')
            .select('id')
            .maybeSingle();

        if (uErr) throw uErr;
        if (!claimedTask) {
            return NextResponse.json(
                { success: false, error: 'already_claimed', message: 'Task was already claimed by another request' },
                { status: 409 }
            );
        }

        const { error: cErr } = await supabaseAdmin.from('task_claims').insert({
            task_id: taskId,
            org_id: orgId,
            user_id: auth.userId,
            claim_status: 'claimed',
            claimed_at: now,
            created_at: now,
            updated_at: now,
        });

        if (cErr) {
            if ((cErr as { code?: string }).code === '23505') {
                return NextResponse.json(
                    { success: false, error: 'already_claimed', message: 'Task already has an active claim' },
                    { status: 409 }
                );
            }
            throw cErr;
        }

        await supabaseAdmin.from('activities').insert({
            org_id: orgId,
            actor_user_id: auth.userId,
            event_type: 'task_claimed',
            entity_type: 'task',
            entity_id: taskId,
            points_delta: 0,
            meta: { task_title: task.title },
            created_at: now,
        });

        await enqueueClaimReminderNotifications({
            orgId,
            userId: auth.userId,
            taskId,
            title: task.title as string,
            points: Number(task.points ?? 0),
            origin: publicOriginFromRequest(request),
            claimedAtIso: now,
        })

        return NextResponse.json({ success: true, data: { ok: true } });
    } catch (e) {
        console.error('POST claim', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_claim_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
