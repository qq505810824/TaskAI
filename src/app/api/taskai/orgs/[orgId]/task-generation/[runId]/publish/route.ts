import { buildTaskaiContextSnapshot } from '@/lib/taskai/task-generation';
import {
    enqueueBulkTaskNewAvailableNotifications,
    enqueueTaskNewAvailableNotifications,
} from '@/lib/taskai/notifications';
import { publicOriginFromRequest } from '@/lib/taskai/public-origin';
import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import type { TaskaiContextDocumentRow, TaskaiProjectRow } from '@/types/taskai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; runId: string }> }
) {
    const { orgId, runId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    let body: { itemIds?: string[] } = {};
    try {
        body = (await request.json()) as { itemIds?: string[] };
    } catch {
        /* */
    }

    try {
        const [{ data: run, error: runError }, { data: items, error: itemError }] = await Promise.all([
            supabaseAdmin.from('taskai_task_generation_runs').select('*').eq('id', runId).eq('org_id', orgId).single(),
            supabaseAdmin
                .from('taskai_task_generation_run_items')
                .select('*')
                .eq('run_id', runId)
                .order('sort_order', { ascending: true }),
        ]);
        if (runError) throw runError;
        if (itemError) throw itemError;

        const selectedItemIds = [...new Set((body.itemIds ?? []).map((itemId) => String(itemId ?? '').trim()).filter(Boolean))];
        const pendingItems = (items ?? [])
            .filter((item) => !item.published_task_id)
            .filter((item) => (selectedItemIds.length ? selectedItemIds.includes(item.id) : true));
        if (!pendingItems.length) {
            return NextResponse.json({ success: true, data: { tasks: [] } });
        }

        const projectId = (run.project_id as string | null) ?? null;
        const [{ data: project, error: projectError }, { data: docLinks, error: docLinkError }] = await Promise.all([
            projectId
                ? supabaseAdmin.from('taskai_projects').select('*').eq('id', projectId).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            supabaseAdmin.from('taskai_task_generation_run_documents').select('document_id').eq('run_id', runId),
        ]);
        if (projectError) throw projectError;
        if (docLinkError) throw docLinkError;

        const docIds = (docLinks ?? []).map((link) => link.document_id);
        const documentsResult = docIds.length
            ? await supabaseAdmin.from('taskai_context_documents').select('*').in('id', docIds)
            : { data: [], error: null };
        if (documentsResult.error) throw documentsResult.error;
        const documents = (documentsResult.data ?? []) as TaskaiContextDocumentRow[];
        const snapshot = buildTaskaiContextSnapshot({
            project: (project as TaskaiProjectRow | null) ?? null,
            documents,
        });
        const { data: publishRows, error: publishError } = await supabaseAdmin.rpc('taskai_publish_generation_run', {
            p_run_id: runId,
            p_org_id: orgId,
            p_owner_id: access.userId,
            p_item_ids: pendingItems.map((item) => item.id),
            p_project_id: projectId,
            p_project_snapshot: snapshot.project_snapshot,
            p_document_summary_snapshot: snapshot.document_summary_snapshot,
        });
        if (publishError) throw publishError;

        const publishedTasks = ((publishRows ?? []) as Array<{ task_id: string; title: string; points: number }>).map((row) => ({
            id: row.task_id,
            title: String(row.title ?? '').trim(),
            points: Number(row.points ?? 0),
        }));
        const publishedTaskIds = publishedTasks.map((task) => task.id);
        const tasksResult = publishedTaskIds.length
            ? await supabaseAdmin.from('tasks').select('*').in('id', publishedTaskIds)
            : { data: [], error: null };
        if (tasksResult.error) throw tasksResult.error;

        const origin = publicOriginFromRequest(request)
        try {
            if (publishedTasks.length === 1) {
                const onlyTask = publishedTasks[0]
                await enqueueTaskNewAvailableNotifications({
                    orgId,
                    taskId: onlyTask.id,
                    title: onlyTask.title,
                    points: onlyTask.points,
                    origin,
                })
            } else if (publishedTasks.length > 1) {
                await enqueueBulkTaskNewAvailableNotifications({
                    orgId,
                    tasks: publishedTasks,
                    origin,
                    batchKey: runId,
                })
            }
        } catch (notificationError) {
            console.error('taskai_publish_generated_tasks_notification_failed', notificationError)
        }

        return NextResponse.json({ success: true, data: { tasks: tasksResult.data ?? [] } });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_publish_generated_tasks_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
