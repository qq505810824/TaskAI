import type { TaskaiContextDocumentRow, TaskaiTaskContextSnapshot } from '@/types/taskai';
import type { ProjectTaskOverviewRow } from '@/lib/taskai/task-projects';

const TEXT_FILE_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.html', '.xml']);

export function sanitizePathPart(value: string) {
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function detectTextExtractionSupport(fileName: string, mimeType: string | null | undefined) {
    const mime = (mimeType ?? '').toLowerCase();
    if (mime.startsWith('text/')) return true;
    if (mime === 'application/json' || mime === 'application/xml') return true;
    const lower = fileName.toLowerCase();
    for (const ext of TEXT_FILE_EXTENSIONS) {
        if (lower.endsWith(ext)) return true;
    }
    return false;
}

export async function extractRawTextFromUpload(params: {
    file: Blob;
    fileName: string;
    mimeType?: string | null;
    contentText?: string | null;
}) {
    const manualText = params.contentText?.trim();
    if (manualText) return manualText;

    if (!detectTextExtractionSupport(params.fileName, params.mimeType)) {
        throw new Error('This document type is not yet supported for text extraction. Please provide contentText or upload a text-based file.');
    }

    const text = await params.file.text();
    if (!text.trim()) {
        throw new Error('Document text is empty after extraction.');
    }
    return text.trim();
}

export function compactDocumentSummaries(documents: Array<Pick<TaskaiContextDocumentRow, 'title' | 'summary' | 'scope' | 'project_name'>>) {
    return documents
        .map((doc, index) => {
            const lines = [
                `# Document ${index + 1}`,
                `Title: ${doc.title}`,
                `Scope: ${doc.scope}`,
                `Project name: ${doc.project_name || '(none)'}`,
                `Summary: ${doc.summary?.trim() || '(no summary)'}`,
            ];
            return lines.join('\n');
        })
        .join('\n\n');
}

export function buildTaskaiProjectDocumentSummary(snapshot: TaskaiTaskContextSnapshot | null) {
    if (!snapshot) return '';

    const documentSummary = Array.isArray((snapshot.document_summary_snapshot as { documents?: unknown[] })?.documents)
        ? ((snapshot.document_summary_snapshot as {
              documents?: Array<{ title?: unknown; summary?: unknown }>;
          }).documents ?? [])
              .map((doc, index) => {
                  const title = String(doc?.title ?? '').trim() || `Document ${index + 1}`;
                  const summary = String(doc?.summary ?? '').trim();
                  return summary ? `${title}: ${summary}` : '';
              })
              .filter(Boolean)
              .join('\n')
        : '';

    return documentSummary
        ? ['Project document summary:', documentSummary].join('\n')
        : '';
}

export function buildTaskaiCurrentTaskSummary(currentTask: {
    title: string;
    description: string | null;
    status: string;
    points?: number | null;
    type?: string | null;
    category?: string | null;
} | null) {
    if (!currentTask) return '';

    const summaryBits = [
        `[${currentTask.status}] ${currentTask.title}`,
        currentTask.category ? `Category: ${currentTask.category}` : '',
        currentTask.points ? `${currentTask.points} pts` : '',
        currentTask.type === 'recurring' ? 'Recurring' : currentTask.type ? 'One-time' : '',
    ]
        .filter(Boolean)
        .join(' · ');

    const lines = ['Current task for this chat:', summaryBits];
    const description = truncateTaskDescription(currentTask.description, 240);
    if (description) {
        lines.push(`Current task details: ${description}`);
    }

    return lines.join('\n').trim();
}

function truncateTaskDescription(value: string | null | undefined, max = 120) {
    const text = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trim()}…`;
}

export function buildTaskaiProjectTaskOverview(params: {
    snapshot: TaskaiTaskContextSnapshot | null;
    currentTask: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        project_id?: string | null;
        points?: number | null;
        type?: string | null;
        category?: string | null;
        project_name?: string | null;
    } | null;
    projectTasks: ProjectTaskOverviewRow[];
}) {
    const projectSummary =
        String((params.snapshot?.project_snapshot as { summary?: unknown } | null)?.summary ?? '').trim()
        || String((params.snapshot?.objective_snapshot as { summary?: unknown } | null)?.summary ?? '').trim();
    const currentProjectName =
        params.currentTask?.project_name?.trim()
        || String((params.snapshot?.project_snapshot as { name?: unknown } | null)?.name ?? '').trim()
        || String((params.snapshot?.objective_snapshot as { project_name?: unknown } | null)?.project_name ?? '').trim()
        || '';

    if (!currentProjectName) return '';

    const normalizedProjectTasks = params.projectTasks
        .filter((task) => task.project_name?.trim() === currentProjectName)
        .sort((a, b) => {
            if (a.id === params.currentTask?.id) return -1;
            if (b.id === params.currentTask?.id) return 1;

            const statusOrder = { in_progress: 0, open: 1, completed: 2 } as const;
            const delta = statusOrder[a.status] - statusOrder[b.status];
            if (delta !== 0) return delta;

            return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        });

    const openCount = normalizedProjectTasks.filter((task) => task.status === 'open').length;
    const inProgressCount = normalizedProjectTasks.filter((task) => task.status === 'in_progress').length;
    const completedCount = normalizedProjectTasks.filter((task) => task.status === 'completed').length;

    const lines = [`Project: ${currentProjectName}`];
    if (projectSummary) {
        lines.push(`Objective: ${projectSummary}`);
    }

    lines.push('');
    lines.push(`Project task overview: ${normalizedProjectTasks.length} total · ${openCount} open · ${inProgressCount} in progress · ${completedCount} completed`);

    if (!normalizedProjectTasks.length) {
        lines.push('- No other linked tasks in this project yet.')
        return lines.join('\n').trim()
    }

    for (const task of normalizedProjectTasks) {
        const detailBits = [
            task.category?.trim() || '',
            `${task.points} pts`,
            task.type === 'recurring' ? 'Recurring' : 'One-time',
        ].filter(Boolean)
        const description = truncateTaskDescription(task.description)
        const prefix = task.id === params.currentTask?.id ? '[Current]' : `[${task.status}]`
        const detailText = detailBits.length ? ` (${detailBits.join(' · ')})` : ''
        const descriptionText = description ? ` — ${description}` : ''
        lines.push(`- ${prefix} ${task.title}${detailText}${descriptionText}`)
    }

    return lines.join('\n').trim();
}
