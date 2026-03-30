import { runTaskaiArkJsonPrompt } from '@/lib/taskai/ark-json';
import { compactDocumentSummaries } from '@/lib/taskai/context-documents';
import type {
    TaskaiContextDocumentRow,
    TaskaiProjectRow,
    TaskaiTaskContextSnapshot,
    TaskaiTaskGenerationProvider,
    TaskaiTaskGenerationRunItem,
} from '@/types/taskai';

type DocumentSummaryPayload = {
    summary?: unknown;
};

type TaskGenerationPayload = {
    tasks?: unknown;
};

function normalizeTaskItems(raw: unknown): Array<Omit<TaskaiTaskGenerationRunItem, 'id' | 'run_id' | 'published_task_id' | 'created_at' | 'updated_at'>> {
    if (!Array.isArray(raw)) return [];

    return raw
        .map((item, index) => {
            const row = (item ?? {}) as Record<string, unknown>;
            const title = String(row.title ?? '').trim();
            const description = String(row.description ?? '').trim();
            const parsedPoints = Math.floor(Number(row.points ?? 0));
            const type = row.type === 'recurring' ? 'recurring' : 'one_time';
            const recurring_frequency =
                type === 'recurring' && (row.recurring_frequency === 'daily' || row.recurring_frequency === 'weekly' || row.recurring_frequency === 'monthly')
                    ? row.recurring_frequency
                    : null;
            const category = String(row.category ?? '').trim() || 'General';

            if (!title) return null;

            return {
                sort_order: index,
                title,
                description: description || null,
                points: Math.max(10, Math.min(Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 100, 500)),
                type,
                recurring_frequency,
                category,
                source_payload: row,
            };
        })
        .filter(Boolean) as Array<Omit<TaskaiTaskGenerationRunItem, 'id' | 'run_id' | 'published_task_id' | 'created_at' | 'updated_at'>>;
}

export async function summarizeTaskaiContextDocument(params: {
    documentTitle: string;
    documentScope: string;
    projectName?: string | null;
    projectObjective?: string | null;
    rawDocumentText: string;
}) {
    const userPrompt = [
        `Document title: ${params.documentTitle || '(untitled document)'}`,
        `Project name: ${params.projectName?.trim() || '(none)'}`,
        `Project objective: ${params.projectObjective?.trim() || '(none)'}`,
        '',
        'Document text:',
        params.rawDocumentText,
    ].join('\n');

    const parsed = await runTaskaiArkJsonPrompt<DocumentSummaryPayload>({
        promptKey: 'taskai_project_document_summary_prompt',
        userPrompt,
        maxTokens: 2200,
    });

    const summary = String(parsed.summary ?? '').trim();
    if (!summary) {
        throw new Error('Document summary model output is missing summary');
    }

    return {
        summary,
    };
}

export async function generateTaskaiTasksFromObjective(params: {
    provider: TaskaiTaskGenerationProvider;
    organizationName: string;
    projectName?: string | null;
    project: Pick<TaskaiProjectRow, 'objective' | 'description'>;
    documents: TaskaiContextDocumentRow[];
    requestedTaskCount: number;
    existingTaskTitles?: string[];
}) {
    if (params.provider !== 'ark') {
        throw new Error('Dify provider is not implemented yet for TaskAI task generation. Use provider=ark for now.');
    }

    const documentSummaries = compactDocumentSummaries(params.documents);
    const userPrompt = [
        `Organization: ${params.organizationName}`,
        `Project name: ${params.projectName?.trim() || '(none)'}`,
        `Project objective: ${params.project.objective?.trim() || '(none)'}`,
        `Project description: ${params.project.description?.trim() || '(none)'}`,
        '',
        'Document summaries:',
        documentSummaries || '(none)',
        '',
        'Existing tasks to avoid duplicating:',
        (params.existingTaskTitles ?? []).length
            ? params.existingTaskTitles!.map((title, index) => `${index + 1}. ${title}`).join('\n')
            : '(none)',
    ].join('\n');

    const parsed = await runTaskaiArkJsonPrompt<TaskGenerationPayload>({
        promptKey: 'taskai_generate_todos_from_project_and_objective',
        userPrompt,
        maxTokens: 2600,
    });

    const tasks = normalizeTaskItems(parsed.tasks);
    if (!tasks.length) {
        throw new Error('Task generation model output did not contain any valid tasks');
    }

    return {
        tasks: tasks.slice(0, Math.max(1, Math.min(params.requestedTaskCount, 12))),
        userPrompt,
    };
}

export function inferTaskaiRequestedTaskCount(params: {
    projectName?: string | null;
    projectObjective?: string | null;
    projectDescription?: string | null;
    documents: Array<Pick<TaskaiContextDocumentRow, 'raw_text' | 'summary'>>;
}) {
    const documentSignal = params.documents.reduce((total, document) => {
        const bestAvailableText = document.raw_text?.trim() || document.summary?.trim() || '';
        return total + bestAvailableText.length;
    }, 0);

    const baseSignal =
        (params.projectName?.trim().length ?? 0)
        + (params.projectObjective?.trim().length ?? 0)
        + (params.projectDescription?.trim().length ?? 0)
        + documentSignal;

    if (baseSignal >= 12000) return 12;
    if (baseSignal >= 7000) return 10;
    if (baseSignal >= 3500) return 8;
    if (baseSignal >= 1500) return 6;
    return 4;
}

export function buildTaskaiContextSnapshot(params: {
    project: TaskaiProjectRow | null;
    documents: TaskaiContextDocumentRow[];
}): Pick<TaskaiTaskContextSnapshot, 'project_snapshot' | 'document_summary_snapshot'> {
    return {
        project_snapshot: params.project
            ? {
                  name: params.project.name,
                  objective: params.project.objective,
                  description: params.project.description,
                  summary: [params.project.objective, params.project.description].filter(Boolean).join(' — '),
              }
            : {},
        document_summary_snapshot: {
            documents: params.documents.map((document) => ({
                id: document.id,
                title: document.title,
                scope: document.scope,
                project_name: document.project_name,
                summary: document.summary,
            })),
        },
    };
}
