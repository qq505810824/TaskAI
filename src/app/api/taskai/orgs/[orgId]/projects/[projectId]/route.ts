import { NextRequest, NextResponse } from 'next/server';

import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; projectId: string }> }
) {
    const { orgId, projectId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const { data: project, error: projectError } = await supabaseAdmin
            .from('taskai_projects')
            .select('id, org_id, name, objective')
            .eq('id', projectId)
            .eq('org_id', orgId)
            .maybeSingle();
        if (projectError) throw projectError;
        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
        }

        const [{ data: documents, error: documentsError }, { data: snapshots, error: snapshotsError }, { data: projectTasks, error: projectTasksError }] =
            await Promise.all([
                supabaseAdmin
                    .from('taskai_context_documents')
                    .select('id, storage_bucket, storage_path')
                    .eq('org_id', orgId)
                    .eq('project_id', projectId),
                supabaseAdmin
                    .from('taskai_task_context_snapshots')
                    .select('task_id')
                    .eq('org_id', orgId)
                    .eq('project_id', projectId),
                supabaseAdmin
                    .from('tasks')
                    .select('id')
                    .eq('org_id', orgId)
                    .eq('project_id', projectId),
            ]);

        if (documentsError) throw documentsError;
        if (snapshotsError) throw snapshotsError;
        if (projectTasksError) throw projectTasksError;

        const taskIds = [...new Set([...(snapshots ?? []).map((row) => row.task_id), ...(projectTasks ?? []).map((row) => row.id)])];
        if (taskIds.length) {
            const { error: taskDeleteError } = await supabaseAdmin.from('tasks').delete().in('id', taskIds);
            if (taskDeleteError) throw taskDeleteError;
        }

        for (const document of documents ?? []) {
            if (document.storage_bucket && document.storage_path) {
                await supabaseAdmin.storage.from(document.storage_bucket).remove([document.storage_path]);
            }
        }

        const { error: projectDeleteError } = await supabaseAdmin
            .from('taskai_projects')
            .delete()
            .eq('id', projectId)
            .eq('org_id', orgId);
        if (projectDeleteError) throw projectDeleteError;

        return NextResponse.json({
            success: true,
            data: {
                deleted: true,
                deletedTaskCount: taskIds.length,
                deletedDocumentCount: (documents ?? []).length,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_delete_project_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
