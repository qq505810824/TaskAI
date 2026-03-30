import {
    summarizeTaskaiContextDocument,
    buildTaskaiContextSnapshot,
    generateTaskaiTasksFromObjective,
    inferTaskaiRequestedTaskCount,
} from '@/lib/taskai/task-generation';
import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import type { TaskaiContextDocumentRow, TaskaiProjectRow, TaskaiTaskGenerationProvider } from '@/types/taskai';
import { NextRequest, NextResponse } from 'next/server';

type GenerateTasksBody = {
    projectId?: string;
    documentIds?: string[];
    requestedTaskCount?: number;
    provider?: TaskaiTaskGenerationProvider;
};

function normalizeExistingTaskTitles(value: unknown) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))].slice(0, 80);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const { orgId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const projectId = request.nextUrl.searchParams.get('projectId')?.trim() || null;
        const includeItems = request.nextUrl.searchParams.get('includeItems') === 'true';

        let runQuery = supabaseAdmin
            .from('taskai_task_generation_runs')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (projectId) {
            runQuery = runQuery.eq('project_id', projectId);
        }

        const { data: runs, error: runError } = await runQuery;
        if (runError) throw runError;

        const runIds = (runs ?? []).map((run) => run.id);
        let itemsByRunId: Record<string, unknown[]> = {};

        if (includeItems && runIds.length) {
            const { data: items, error: itemError } = await supabaseAdmin
                .from('taskai_task_generation_run_items')
                .select('*')
                .in('run_id', runIds)
                .order('sort_order', { ascending: true });
            if (itemError) throw itemError;

            itemsByRunId = (items ?? []).reduce<Record<string, unknown[]>>((acc, item) => {
                if (!acc[item.run_id]) acc[item.run_id] = [];
                acc[item.run_id].push(item);
                return acc;
            }, {});
        }

        return NextResponse.json({ success: true, data: { runs: runs ?? [], itemsByRunId } });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_task_generation_runs_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const { orgId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    let body: GenerateTasksBody = {};
    try {
        body = (await request.json()) as GenerateTasksBody;
    } catch {
        /* */
    }

    const projectId = body.projectId?.trim();
    if (!projectId) {
        return NextResponse.json({ success: false, message: 'projectId required' }, { status: 400 });
    }

    const provider = body.provider ?? 'ark';

    let runId: string | null = null;

    try {
        const [{ data: organization, error: orgError }, { data: project, error: projectError }] = await Promise.all([
            supabaseAdmin.from('organizations').select('id, name').eq('id', orgId).single(),
            supabaseAdmin.from('taskai_projects').select('*').eq('id', projectId).eq('org_id', orgId).single(),
        ]);
        if (orgError) throw orgError;
        if (projectError) throw projectError;

        const selectedDocumentIds = [...new Set((body.documentIds ?? []).map((id) => id.trim()).filter(Boolean))];
        const documentsResult = selectedDocumentIds.length
            ? await supabaseAdmin
                  .from('taskai_context_documents')
                  .select('*')
                  .eq('org_id', orgId)
                  .in('id', selectedDocumentIds)
            : { data: [], error: null };
        if (documentsResult.error) throw documentsResult.error;

        const documents = (documentsResult.data ?? []) as TaskaiContextDocumentRow[];
        for (const document of documents) {
            if (document.summary?.trim()) continue;
            if (!document.raw_text?.trim()) {
                throw new Error(`Document "${document.title}" has no extracted text and cannot be summarized.`);
            }
            const summaryResult = await summarizeTaskaiContextDocument({
                documentTitle: document.title,
                documentScope: document.scope,
                projectName: document.project_name,
                projectObjective: project.objective,
                rawDocumentText: document.raw_text,
            });

            const { error: updateError } = await supabaseAdmin
                .from('taskai_context_documents')
                .update({
                    summary: summaryResult.summary,
                    summary_payload: summaryResult,
                    summary_status: 'ready',
                    summary_error: null,
                })
                .eq('id', document.id);
            if (updateError) throw updateError;
            document.summary = summaryResult.summary;
            document.summary_payload = summaryResult;
            document.summary_status = 'ready';
        }

        const [{ data: historicalRuns, error: historicalRunsError }, { data: snapshotRows, error: snapshotError }] =
            await Promise.all([
                supabaseAdmin
                    .from('taskai_task_generation_runs')
                    .select('id')
                    .eq('org_id', orgId)
                    .eq('project_id', projectId),
                supabaseAdmin
                    .from('taskai_task_context_snapshots')
                    .select('task_id')
                    .eq('org_id', orgId)
                    .eq('project_id', projectId),
            ]);
        if (historicalRunsError) throw historicalRunsError;
        if (snapshotError) throw snapshotError;

        const historicalRunIds = (historicalRuns ?? []).map((run) => run.id).filter(Boolean);
        const historicalItemsResult = historicalRunIds.length
            ? await supabaseAdmin
                  .from('taskai_task_generation_run_items')
                  .select('title')
                  .in('run_id', historicalRunIds)
            : { data: [], error: null };
        if (historicalItemsResult.error) throw historicalItemsResult.error;

        const publishedTaskIds = (snapshotRows ?? []).map((row) => row.task_id).filter(Boolean);
        const publishedTasksResult = publishedTaskIds.length
            ? await supabaseAdmin
                  .from('tasks')
                  .select('title')
                  .in('id', publishedTaskIds)
            : { data: [], error: null };
        if (publishedTasksResult.error) throw publishedTasksResult.error;

        const existingTaskTitles = normalizeExistingTaskTitles([
            ...(historicalItemsResult.data ?? []).map((item) => item.title),
            ...(publishedTasksResult.data ?? []).map((task) => task.title),
        ]);

        const requestedTaskCount = Math.max(
            1,
            Math.min(
                Math.floor(
                    body.requestedTaskCount
                    ?? inferTaskaiRequestedTaskCount({
                        projectName: (project as TaskaiProjectRow).name,
                        projectObjective: (project as TaskaiProjectRow).objective,
                        projectDescription: (project as TaskaiProjectRow).description,
                        documents,
                    })
                ),
                12
            )
        );

        const inputPayload = {
            projectId,
            documentIds: documents.map((document) => document.id),
            requestedTaskCount,
            provider,
            context_snapshot: buildTaskaiContextSnapshot({
                project: project as TaskaiProjectRow,
                documents,
            }),
        };

        const { data: run, error: runError } = await supabaseAdmin
            .from('taskai_task_generation_runs')
            .insert({
                org_id: orgId,
                project_id: projectId,
                provider,
                prompt_key: 'taskai_generate_todos_from_project_and_objective',
                model_target: provider === 'ark' ? 'ARK_MODEL_ID' : 'DIFY',
                status: 'running',
                input_payload: inputPayload,
                output_payload: {},
                error_message: null,
                created_by: access.userId,
            })
            .select('*')
            .single();
        if (runError) throw runError;
        runId = run.id;

        if (documents.length) {
            const { error: linkError } = await supabaseAdmin.from('taskai_task_generation_run_documents').insert(
                documents.map((document) => ({
                    run_id: run.id,
                    document_id: document.id,
                }))
            );
            if (linkError) throw linkError;
        }

        const generated = await generateTaskaiTasksFromObjective({
            provider,
            organizationName: organization.name,
            projectName: (project as TaskaiProjectRow).name,
            project: project as TaskaiProjectRow,
            documents,
            requestedTaskCount,
            existingTaskTitles,
        });

        const itemRows = generated.tasks.map((task) => ({
            run_id: run.id,
            sort_order: task.sort_order,
            title: task.title,
            description: task.description,
            points: task.points,
            type: task.type,
            recurring_frequency: task.recurring_frequency,
            category: task.category,
            source_payload: task.source_payload,
        }));

        const { data: items, error: itemError } = await supabaseAdmin
            .from('taskai_task_generation_run_items')
            .insert(itemRows)
            .select('*')
            .order('sort_order', { ascending: true });
        if (itemError) throw itemError;

        const { data: finalRun, error: finalRunError } = await supabaseAdmin
            .from('taskai_task_generation_runs')
            .update({
                status: 'ready',
                output_payload: {
                    generated_task_count: items?.length ?? 0,
                    provider,
                    user_prompt: generated.userPrompt,
                },
                error_message: null,
            })
            .eq('id', run.id)
            .select('*')
            .single();
        if (finalRunError) throw finalRunError;

        return NextResponse.json({ success: true, data: { run: finalRun, items: items ?? [] } }, { status: 201 });
    } catch (error) {
        if (runId) {
            await supabaseAdmin
                .from('taskai_task_generation_runs')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                })
                .eq('id', runId);
        }

        return NextResponse.json(
            {
                success: false,
                error: 'taskai_generate_tasks_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
