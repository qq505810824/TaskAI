import { requireAuthUser } from '@/lib/taskai/api-auth';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function canDeleteEvidence(task: { assignee_user_id: string | null; status: string }, userId: string) {
    return task.assignee_user_id === userId && task.status === 'in_progress';
}

export async function DELETE(
    request: NextRequest,
    ctx: { params: Promise<{ taskId: string; evidenceId: string }> }
) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId, evidenceId } = await ctx.params;
    if (!taskId || !evidenceId) {
        return NextResponse.json({ success: false, message: 'taskId and evidenceId required' }, { status: 400 });
    }

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });
    if (!canDeleteEvidence(access.task, auth.userId)) {
        return NextResponse.json(
            { success: false, message: 'Only the active assignee can delete completion evidence while the task is in progress.' },
            { status: 403 }
        );
    }

    try {
        const { data: evidence, error: evidenceError } = await supabaseAdmin
            .from('taskai_task_completion_evidence')
            .select('id, task_id, user_id, storage_bucket, storage_path')
            .eq('id', evidenceId)
            .eq('task_id', taskId)
            .maybeSingle();

        if (evidenceError) throw evidenceError;
        if (!evidence) {
            return NextResponse.json({ success: false, message: 'Evidence not found' }, { status: 404 });
        }
        if (evidence.user_id !== auth.userId) {
            return NextResponse.json({ success: false, message: 'You can only delete your own evidence.' }, { status: 403 });
        }

        if (evidence.storage_bucket && evidence.storage_path) {
            await supabaseAdmin.storage.from(evidence.storage_bucket).remove([evidence.storage_path]);
        }

        const { error: deleteError } = await supabaseAdmin
            .from('taskai_task_completion_evidence')
            .delete()
            .eq('id', evidenceId)
            .eq('task_id', taskId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, data: { deleted: true } });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_delete_completion_evidence_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
