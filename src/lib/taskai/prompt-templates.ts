import { supabaseAdmin } from '@/lib/supabase';
import type { TaskaiPromptKey, TaskaiPromptTemplate } from '@/types/taskai';

type StoredPromptRow = {
    prompt_key: TaskaiPromptKey;
    content: string;
    updated_at: string;
    updated_by: string | null;
};

export const TASKAI_RTC_RUNTIME_INSTRUCTION = [
    'Use the project background and the full project task list only as supporting context.',
    'The current task we are talking about right now is the one shown in the current-task section.',
    'Stay focused on that current task and the session topic.',
].join(' ');

const DEFAULT_PROMPT_DEFINITIONS: Record<
    TaskaiPromptKey,
    Omit<TaskaiPromptTemplate, 'source' | 'updated_at' | 'updated_by'>
> = {
    taskai_rtc_tutor_template: {
        prompt_key: 'taskai_rtc_tutor_template',
        title: 'RTC Brainstorm Prompt',
        description:
            'TaskAI 语音 workspace 的主 brainstorming 模板。启动 RTC session 且带有 topic / description 时使用。',
        service: 'volc_rtc_s2s',
        model_target: 'VOLC_S2S_MODEL',
        placeholders: ['{{topic}}', '{{description}}'],
        placeholder_rules:
            'This template requires both {{topic}} and {{description}}. Saved project / document context is injected separately at runtime, so do not manually hardcode business context into the editable brainstorming template.',
        required_inputs: ['topic', 'description', 'projectDocumentSummary', 'currentTaskSummary', 'projectTaskOverview'],
        runtime_context_label: 'Readonly Runtime Prompt Composition',
        runtime_context_description:
            'When a task already has saved project context, TaskAI prepends the uploaded document summary, the current task summary, and the project task overview directly before this RTC Brainstorm Prompt. The block below shows the extra runtime context added ahead of the editable prompt.',
        runtime_context_template: [
            '[Runtime Instruction]',
            TASKAI_RTC_RUNTIME_INSTRUCTION,
            '',
            "Here's the project background summary:",
            '{{projectDocumentSummary}}',
            '',
            "Here's all the tasks for this project:",
            '{{projectTaskOverview}}',
            '',
            'The current task we are talking about right now is:',
            '{{currentTaskSummary}}',
            '',
            '[Editable RTC Brainstorm Prompt]',
            '{{rtcBrainstormPrompt}}',
        ].join('\n'),
        runtime_context_placeholders: ['{{projectDocumentSummary}}', '{{currentTaskSummary}}', '{{projectTaskOverview}}', '{{rtcBrainstormPrompt}}'],
        content: `You are TaskAI's real-time brainstorming partner for project management work.

The session topic is "{{topic}}".
Task description and extra context are "{{description}}".

Your role is to help the user think through project goals, scope, priorities, risks, dependencies, trade-offs, deliverables, timelines, and next steps.

### Conversation style
- Sound like a thoughtful project strategy partner, not a teacher or examiner.
- Be concise, practical, and collaborative.
- Ask one focused question at a time when more clarity is needed.
- If the user already gave enough detail, do not keep asking questions only for the sake of asking; instead, help synthesize, structure, or challenge the plan.
- Respond in the same language the user is using, unless the user clearly asks for another language.

### What good responses look like
- Clarify the objective and what success looks like.
- Help break large ideas into executable workstreams or milestones.
- Surface risks, blockers, assumptions, and missing stakeholders.
- Suggest ways to prioritize and sequence the work.
- Offer concrete brainstorming ideas, not generic motivational language.

### Boundaries
- Stay aligned with the topic, description, and any injected TaskAI context.
- Do not fabricate facts, project status, or decisions that the user has not stated.
- Do not turn the conversation into language learning, classroom coaching, or small talk.
- Avoid unnecessarily long monologues. Keep the exchange moving and useful.

### Goal
Help the user leave the conversation with clearer thinking, better project structure, and stronger next-step ideas.`,
    },
    taskai_ai_chat_summary_prompt: {
        prompt_key: 'taskai_ai_chat_summary_prompt',
        title: 'AI Chat Summary Prompt',
        description:
            'Used after the user finishes an AI brainstorming chat. It turns the conversation transcript into a saved summary and key points, and it must not generate todos.',
        service: 'ark_chat_completions',
        model_target: 'ARK_MODEL_ID',
        placeholders: [],
        placeholder_rules:
            'This prompt does not support {{placeholders}}. Runtime context is injected separately in the user message, so the prompt must keep strict JSON output requirements and should not depend on custom placeholders.',
        required_inputs: ['taskTitle', 'taskDescription', 'language', 'transcript'],
        runtime_context_label: 'Readonly Runtime User Prompt',
        runtime_context_description:
            'This user prompt is appended at runtime together with the editable Chat Summary system prompt. It shows the task metadata and the full conversation transcript sent to the model.',
        runtime_context_template: [
            'Task title: {{taskTitle}}',
            'Task description: {{taskDescription}}',
            'Output language: {{language}}',
            '',
            'Transcript:',
            '{{transcript}}',
        ].join('\n'),
        runtime_context_placeholders: ['{{taskTitle}}', '{{taskDescription}}', '{{language}}', '{{transcript}}'],
        content: [
            'You are an assistant for TaskAI task session summarization.',
            'Return ONLY strict JSON with this exact shape:',
            '{"summary": string, "key_points": [{"point": string, "detail": string}]}',
            'No markdown code fences, no extra text.',
            'Do not include todos or action lists.',
            'Do not hallucinate facts not in transcript.',
        ].join('\n'),
    },
    taskai_project_document_summary_prompt: {
        prompt_key: 'taskai_project_document_summary_prompt',
        title: 'Project Document Summary Prompt',
        description:
            'Used immediately after a project document is uploaded. It turns the source material into one reusable natural-language summary that later powers task generation and AI brainstorming context.',
        service: 'ark_chat_completions',
        model_target: 'ARK_MODEL_ID',
        placeholders: [],
        placeholder_rules:
            'This prompt does not support {{placeholders}}. Runtime context is injected separately in the user message and already includes the document text, project name, and optional objective information.',
        required_inputs: ['documentTitle', 'projectName', 'projectObjective', 'rawDocumentText'],
        runtime_context_label: 'Readonly Runtime User Prompt',
        runtime_context_description:
            'This user prompt is appended at runtime together with the editable Project Document Summary system prompt. It contains the uploaded document text plus the optional project and objective metadata.',
        runtime_context_template: [
            'Document title: {{documentTitle}}',
            'Project name: {{projectName}}',
            'Project objective: {{projectObjective}}',
            '',
            'Document text:',
            '{{rawDocumentText}}',
        ].join('\n'),
        runtime_context_placeholders: [
            '{{documentTitle}}',
            '{{projectName}}',
            '{{projectObjective}}',
            '{{rawDocumentText}}',
        ],
        content: [
            'You summarize project reference documents for TaskAI.',
            'Return ONLY strict JSON with this exact shape:',
            '{"summary": string}',
            'No markdown code fences, no extra text.',
            'Write one concise but informative natural-language summary in the "summary" field.',
            'Mention the important goals, scope, constraints, terminology, dependencies, audience, timeline, and recommended focus naturally inside the summary text when they are present in the document.',
            'Do not return separate arrays for constraints, focus, or key points.',
            'Do not hallucinate information not present in the document text.',
        ].join('\n'),
    },
    taskai_generate_todos_from_project_and_objective: {
        prompt_key: 'taskai_generate_todos_from_project_and_objective',
        title: 'Generate Todos from Project & Objective',
        description:
            'Used when the admin clicks Generate Todos. It creates candidate todos from the project, optional objective details, and selected project document summaries.',
        service: 'ark_chat_completions',
        model_target: 'TASKAI_TASK_GENERATION_PROVIDER / ARK_MODEL_ID',
        placeholders: [],
        placeholder_rules:
            'This prompt does not support {{placeholders}}. Runtime context is injected separately and already includes the project, optional objective, and selected document summaries.',
        required_inputs: ['organizationName', 'projectName', 'projectObjective', 'projectDescription', 'documentSummaries', 'existingTaskTitles'],
        runtime_context_label: 'Readonly Runtime User Prompt',
        runtime_context_description:
            'This user prompt is appended at runtime together with the editable Project Todo Generation system prompt. It contains the project context, optional objective, selected document summaries, and any existing tasks the model should avoid duplicating.',
        runtime_context_template: [
            'Organization: {{organizationName}}',
            'Project name: {{projectName}}',
            'Project objective: {{projectObjective}}',
            'Project description: {{projectDescription}}',
            '',
            'Document summaries:',
            '{{documentSummaries}}',
            '',
            'Existing tasks to avoid duplicating:',
            '{{existingTaskTitles}}',
        ].join('\n'),
        runtime_context_placeholders: [
            '{{organizationName}}',
            '{{projectName}}',
            '{{projectObjective}}',
            '{{projectDescription}}',
            '{{documentSummaries}}',
            '{{existingTaskTitles}}',
        ],
        content: [
            'You generate TaskAI todo candidates from a project, an optional business objective, and selected context documents.',
            'Return ONLY strict JSON with this exact shape:',
            '{"tasks":[{"title":string,"description":string,"points":number,"type":"one_time"|"recurring","recurring_frequency":null|"daily"|"weekly"|"monthly","category":string,"reason":string}]}',
            'No markdown code fences, no extra text.',
            'Generate practical and non-duplicative tasks that clearly advance the project and any stated objective.',
            'If existing tasks are provided in runtime context, avoid generating near-duplicates or reworded copies of those tasks.',
            'Points must be integers between 10 and 500.',
            'If type is "one_time", recurring_frequency must be null.',
            'If type is "recurring", recurring_frequency must be one of daily/weekly/monthly.',
        ].join('\n'),
    },
};

export const TASKAI_PROMPT_KEYS = Object.keys(DEFAULT_PROMPT_DEFINITIONS) as TaskaiPromptKey[];

type TaskaiPromptCacheState = {
    templates: TaskaiPromptTemplate[];
    loadedAt: number;
};

declare global {
    // eslint-disable-next-line no-var
    var __taskaiPromptCacheState: TaskaiPromptCacheState | undefined;
}

function isMissingPromptTable(error: unknown) {
    const code = typeof error === 'object' && error !== null ? String((error as { code?: string }).code ?? '') : '';
    const message =
        typeof error === 'object' && error !== null ? String((error as { message?: string }).message ?? '') : '';
    return code === '42P01' || message.toLowerCase().includes('taskai_prompt_templates');
}

export function getDefaultTaskaiPromptTemplate(promptKey: TaskaiPromptKey): TaskaiPromptTemplate {
    const definition = DEFAULT_PROMPT_DEFINITIONS[promptKey];
    return {
        ...definition,
        source: 'default',
        updated_at: null,
        updated_by: null,
    };
}

async function fetchStoredPromptRows(promptKeys?: TaskaiPromptKey[]): Promise<StoredPromptRow[]> {
    try {
        let query = supabaseAdmin
            .from('taskai_prompt_templates')
            .select('prompt_key, content, updated_at, updated_by');

        if (promptKeys?.length) {
            query = query.in('prompt_key', promptKeys);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data ?? []) as StoredPromptRow[];
    } catch (error) {
        if (isMissingPromptTable(error)) {
            return [];
        }
        throw error;
    }
}

function mergePromptTemplates(storedRows: StoredPromptRow[]): TaskaiPromptTemplate[] {
    const storedMap = new Map(storedRows.map((row) => [row.prompt_key, row]));

    return TASKAI_PROMPT_KEYS.map((promptKey) => {
        const base = getDefaultTaskaiPromptTemplate(promptKey);
        const stored = storedMap.get(promptKey);
        if (!stored) return base;
        return {
            ...base,
            content: stored.content,
            source: 'database',
            updated_at: stored.updated_at,
            updated_by: stored.updated_by,
        };
    });
}

export async function preloadTaskaiPromptTemplates(options?: {
    force?: boolean;
}): Promise<TaskaiPromptCacheState> {
    if (!options?.force && globalThis.__taskaiPromptCacheState) {
        return globalThis.__taskaiPromptCacheState;
    }

    const storedRows = await fetchStoredPromptRows();
    const nextState: TaskaiPromptCacheState = {
        templates: mergePromptTemplates(storedRows),
        loadedAt: Date.now(),
    };

    globalThis.__taskaiPromptCacheState = nextState;
    return nextState;
}

export function invalidateTaskaiPromptTemplateCache() {
    globalThis.__taskaiPromptCacheState = undefined;
}

export async function listTaskaiPromptTemplates(options?: {
    force?: boolean;
}): Promise<TaskaiPromptTemplate[]> {
    const state = await preloadTaskaiPromptTemplates(options);
    return state.templates;
}

export async function getTaskaiPromptContent(promptKey: TaskaiPromptKey): Promise<string> {
    const state = await preloadTaskaiPromptTemplates();
    return state.templates.find((template) => template.prompt_key === promptKey)?.content
        || DEFAULT_PROMPT_DEFINITIONS[promptKey].content;
}

export function buildRtcPromptFromTemplate(template: string, topic: string, description: string): string {
    return template.replace('{{topic}}', (topic ?? '').trim()).replace('{{description}}', (description ?? '').trim());
}

export function prependTaskaiRuntimeContext(prompt: string, runtimeContext: string | null | undefined): string {
    const block = (runtimeContext ?? '').trim();
    if (!block) return prompt;
    return [`[TaskAI Context]`, block, '', prompt].join('\n');
}
