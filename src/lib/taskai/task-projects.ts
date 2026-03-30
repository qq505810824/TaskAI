import { supabaseAdmin } from '@/lib/supabase';

type TaskLikeRow = {
    id: string;
    project_id?: string | null;
    project_name?: string | null;
};

export type ProjectTaskOverviewRow = {
    id: string;
    project_id?: string | null;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'completed';
    points: number;
    type: 'one_time' | 'recurring';
    category: string | null;
    created_at: string;
    updated_at: string;
    project_name?: string | null;
};

type SnapshotRow = {
    task_id: string;
    project_id?: string | null;
    objective_id?: string | null;
    project_snapshot?: Record<string, unknown> | null;
    objective_snapshot: Record<string, unknown> | null;
    document_summary_snapshot: Record<string, unknown> | null;
};

function readProjectNameFromSnapshot(snapshot: SnapshotRow) {
    const projectName = String((snapshot.project_snapshot as { name?: unknown } | null)?.name ?? '').trim();
    if (projectName) return projectName;

    const objectiveProjectName = String((snapshot.objective_snapshot as { project_name?: unknown } | null)?.project_name ?? '').trim();
    if (objectiveProjectName) return objectiveProjectName;

    const documents = ((snapshot.document_summary_snapshot as { documents?: unknown } | null)?.documents ?? []) as Array<{
        project_name?: unknown;
    }>;
    for (const document of documents) {
        const projectName = String(document?.project_name ?? '').trim();
        if (projectName) return projectName;
    }

    return null;
}

export async function attachTaskProjectNames<T extends TaskLikeRow>(tasks: T[]): Promise<T[]> {
    if (!tasks.length) return tasks;

    const taskIds = [...new Set(tasks.map((task) => task.id).filter(Boolean))];
    if (!taskIds.length) return tasks;

    const { data, error } = await supabaseAdmin
        .from('taskai_task_context_snapshots')
        .select('task_id, project_id, objective_id, project_snapshot, objective_snapshot, document_summary_snapshot')
        .in('task_id', taskIds);

    if (error) throw error;

    const snapshotRows = (data ?? []) as SnapshotRow[];
    const snapshotMap = new Map(snapshotRows.map((snapshot) => [snapshot.task_id, snapshot]));
    const projectIds = [
        ...new Set(
            [
                ...tasks.map((task) => task.project_id).filter(Boolean),
                ...snapshotRows.map((snapshot) => snapshot.project_id).filter(Boolean),
                ...snapshotRows.map((snapshot) => snapshot.objective_id).filter(Boolean),
            ] as string[]
        ),
    ];

    let projectNameMap = new Map<string, string>();
    if (projectIds.length) {
        const { data: projects, error: projectError } = await supabaseAdmin
            .from('taskai_projects')
            .select('id, name')
            .in('id', projectIds);
        if (projectError) throw projectError;
        projectNameMap = new Map((projects ?? []).map((project) => [String(project.id), String(project.name ?? '').trim()]));
    }

    return tasks.map((task) => ({
        ...task,
        project_id: task.project_id ?? snapshotMap.get(task.id)?.project_id ?? snapshotMap.get(task.id)?.objective_id ?? null,
        project_name:
            (task.project_id ? projectNameMap.get(task.project_id) : '')
            || (snapshotMap.get(task.id)?.project_id ? projectNameMap.get(String(snapshotMap.get(task.id)?.project_id)) : '')
            || (snapshotMap.get(task.id)?.objective_id ? projectNameMap.get(String(snapshotMap.get(task.id)?.objective_id)) : '')
            || (snapshotMap.get(task.id) ? readProjectNameFromSnapshot(snapshotMap.get(task.id) as SnapshotRow) : '')
            || task.project_name
            || null,
    }));
}

export async function attachSingleTaskProjectName<T extends TaskLikeRow>(task: T): Promise<T> {
    const [enriched] = await attachTaskProjectNames([task]);
    return enriched;
}

export async function listProjectTasksByProjectId(orgId: string, projectId: string): Promise<ProjectTaskOverviewRow[]> {
    const targetProjectId = projectId.trim();
    if (!targetProjectId) return [];

    const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('id, project_id, title, description, status, points, type, category, created_at, updated_at')
        .eq('org_id', orgId);

    if (error) throw error;

    const enriched = await attachTaskProjectNames((data ?? []) as ProjectTaskOverviewRow[]);
    return enriched.filter((task) => task.project_id?.trim() === targetProjectId);
}
