import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type UpdateItemBody = {
    title?: string;
    description?: string | null;
    points?: number;
    type?: 'one_time' | 'recurring';
    recurring_frequency?: 'daily' | 'weekly' | 'monthly' | null;
    category?: string | null;
};

export async function PATCH(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; runId: string; itemId: string }> }
) {
    const { orgId, runId, itemId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    let body: UpdateItemBody = {};
    try {
        body = (await request.json()) as UpdateItemBody;
    } catch {
        /* */
    }

    try {
        const { data: item, error: fetchError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .select('id, run_id, published_task_id')
            .eq('id', itemId)
            .eq('run_id', runId)
            .single();
        if (fetchError) throw fetchError;
        if (item.published_task_id) {
            return NextResponse.json(
                { success: false, message: 'Published tasks can no longer be edited here.' },
                { status: 400 }
            );
        }

        const normalizedType = body.type === 'recurring' ? 'recurring' : 'one_time';
        const updatePayload = {
            title: String(body.title ?? '').trim(),
            description: String(body.description ?? '').trim() || null,
            points: Math.max(10, Math.min(Math.floor(Number(body.points ?? 0)) || 100, 500)),
            type: normalizedType,
            recurring_frequency:
                normalizedType === 'recurring'
                    && (body.recurring_frequency === 'daily'
                        || body.recurring_frequency === 'weekly'
                        || body.recurring_frequency === 'monthly')
                    ? body.recurring_frequency
                    : null,
            category: String(body.category ?? '').trim() || 'General',
        };

        if (!updatePayload.title) {
            return NextResponse.json({ success: false, message: 'title required' }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .update(updatePayload)
            .eq('id', itemId)
            .eq('run_id', runId)
            .select('*')
            .single();
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, data: { item: updated } });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_update_task_generation_item_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; runId: string; itemId: string }> }
) {
    const { orgId, runId, itemId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const { data: item, error: fetchError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .select('id, run_id, published_task_id')
            .eq('id', itemId)
            .eq('run_id', runId)
            .single();
        if (fetchError) throw fetchError;
        if (item.published_task_id) {
            return NextResponse.json(
                { success: false, message: 'Published tasks can no longer be deleted here.' },
                { status: 400 }
            );
        }

        const { error: deleteError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .delete()
            .eq('id', itemId)
            .eq('run_id', runId);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_delete_task_generation_item_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
