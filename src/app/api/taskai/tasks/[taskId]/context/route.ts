import { requireAuthUser } from '@/lib/taskai/api-auth';
import {
    buildTaskaiCurrentTaskSummary,
    buildTaskaiProjectDocumentSummary,
    buildTaskaiProjectTaskOverview,
} from '@/lib/taskai/context-documents';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { listProjectTasksByProjectId } from '@/lib/taskai/task-projects';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;

    try {
        const access = await requireTaskAccess(auth.userId, taskId);
        if (!access.ok) {
            return NextResponse.json({ success: false, message: access.message }, { status: access.status });
        }

        const [{ data, error }, { data: currentTaskRow, error: taskError }] = await Promise.all([
            supabaseAdmin
                .from('taskai_task_context_snapshots')
                .select('*')
                .eq('task_id', taskId)
                .maybeSingle(),
            supabaseAdmin
                .from('tasks')
                .select('id, project_id, title, description, status, points, type, category')
                .eq('id', taskId)
                .maybeSingle(),
        ]);
        if (error) throw error;
        if (taskError) throw taskError;

        const projectTasks = access.task.project_id?.trim()
            ? await listProjectTasksByProjectId(access.task.org_id, access.task.project_id)
            : [];

        const projectDocumentSummary = buildTaskaiProjectDocumentSummary(data ?? null);
        const currentTaskSummary = buildTaskaiCurrentTaskSummary(
            currentTaskRow ?? null
        );
        const projectTaskOverview = buildTaskaiProjectTaskOverview({
            snapshot: data ?? null,
            currentTask: currentTaskRow
                ? {
                      ...currentTaskRow,
                      project_id: access.task.project_id ?? null,
                      project_name: access.task.project_name ?? null,
                  }
                : null,
            projectTasks,
        });

        return NextResponse.json({
            success: true,
            data: {
                context: data ?? null,
                projectDocumentSummary,
                currentTaskSummary,
                projectTaskOverview,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_task_context_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
