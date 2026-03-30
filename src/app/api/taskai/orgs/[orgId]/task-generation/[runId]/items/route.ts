import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; runId: string }> }
) {
    const { orgId, runId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const { data: run, error: runError } = await supabaseAdmin
            .from('taskai_task_generation_runs')
            .select('id, status')
            .eq('id', runId)
            .eq('org_id', orgId)
            .single();
        if (runError) throw runError;

        const { data: existingItems, error: existingItemsError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .select('sort_order')
            .eq('run_id', runId)
            .order('sort_order', { ascending: false })
            .limit(1);
        if (existingItemsError) throw existingItemsError;

        const nextSortOrder = Number(existingItems?.[0]?.sort_order ?? -1) + 1;

        const { data: item, error: insertError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .insert({
                run_id: runId,
                sort_order: nextSortOrder,
                title: 'New Task',
                description: null,
                points: 100,
                type: 'one_time',
                recurring_frequency: null,
                category: 'General',
                source_payload: { source: 'manual' },
            })
            .select('*')
            .single();
        if (insertError) throw insertError;

        if (run.status === 'published') {
            const { error: updateRunError } = await supabaseAdmin
                .from('taskai_task_generation_runs')
                .update({ status: 'ready' })
                .eq('id', runId);
            if (updateRunError) throw updateRunError;
        }

        return NextResponse.json({ success: true, data: { item } }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_create_task_generation_item_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
