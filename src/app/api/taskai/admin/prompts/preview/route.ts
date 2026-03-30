import { NextRequest, NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import {
    TASKAI_PROMPT_KEYS,
    TASKAI_RTC_RUNTIME_INSTRUCTION,
    buildRtcPromptFromTemplate,
    prependTaskaiRuntimeContext,
} from '@/lib/taskai/prompt-templates';
import { runTaskaiArkJsonPromptWithSystemPrompt } from '@/lib/taskai/ark-json';
import type { TaskaiPromptKey } from '@/types/taskai';

type PreviewInputMap = Record<string, string>;

function isValidPromptKey(promptKey: string): promptKey is TaskaiPromptKey {
    return TASKAI_PROMPT_KEYS.includes(promptKey as TaskaiPromptKey);
}

async function requireOwnerAccess(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth;

    const orgId = request.nextUrl.searchParams.get('orgId');
    if (!orgId) {
        return {
            ok: false as const,
            response: NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 }),
        };
    }

    const membership = await getActiveMembership(auth.userId, orgId);
    if (!membership || membership.role !== 'owner') {
        return {
            ok: false as const,
            response: NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }),
        };
    }

    return { ok: true as const, orgId, userId: auth.userId };
}

function readInput(inputs: PreviewInputMap, key: string, fallback = '') {
    return String(inputs[key] ?? fallback).trim();
}

function buildAiChatSummaryUserPrompt(inputs: PreviewInputMap) {
    return [
        `Task title: ${readInput(inputs, 'taskTitle', '(untitled task)')}`,
        `Task description: ${readInput(inputs, 'taskDescription', '(none)')}`,
        `Output language: ${readInput(inputs, 'language', 'English')}`,
        '',
        'Transcript:',
        readInput(inputs, 'transcript', '(empty transcript)'),
    ].join('\n');
}

function buildProjectDocumentSummaryUserPrompt(inputs: PreviewInputMap) {
    return [
        `Document title: ${readInput(inputs, 'documentTitle', '(untitled document)')}`,
        `Project name: ${readInput(inputs, 'projectName', '(none)')}`,
        `Project objective: ${readInput(inputs, 'projectObjective', '(none)')}`,
        '',
        'Document text:',
        readInput(inputs, 'rawDocumentText', '(empty document)'),
    ].join('\n');
}

function buildGenerateTodosUserPrompt(inputs: PreviewInputMap) {
    return [
        `Organization: ${readInput(inputs, 'organizationName', '(organization)')}`,
        `Project name: ${readInput(inputs, 'projectName', '(none)')}`,
        `Project objective: ${readInput(inputs, 'projectObjective', '(none)')}`,
        `Project description: ${readInput(inputs, 'projectDescription', '(none)')}`,
        '',
        'Document summaries:',
        readInput(inputs, 'documentSummaries', '(none)'),
        '',
        'Existing tasks to avoid duplicating:',
        readInput(inputs, 'existingTaskTitles', '(none)'),
    ].join('\n');
}

export async function POST(request: NextRequest) {
    const access = await requireOwnerAccess(request);
    if (!access.ok) return access.response;

    let body: { promptKey?: string; content?: string; inputs?: PreviewInputMap } = {};
    try {
        body = (await request.json()) as { promptKey?: string; content?: string; inputs?: PreviewInputMap };
    } catch {
        /* empty */
    }

    const promptKey = String(body.promptKey ?? '').trim();
    const content = String(body.content ?? '').trim();
    const inputs = body.inputs && typeof body.inputs === 'object' ? body.inputs : {};

    if (!promptKey || !content) {
        return NextResponse.json(
            { success: false, message: 'promptKey and content are required' },
            { status: 400 }
        );
    }

    if (!isValidPromptKey(promptKey)) {
        return NextResponse.json({ success: false, message: 'Unknown promptKey' }, { status: 400 });
    }

    try {
        if (promptKey === 'taskai_rtc_tutor_template') {
            const composedPrompt = buildRtcPromptFromTemplate(
                content,
                readInput(inputs, 'topic'),
                readInput(inputs, 'description')
            );
            const runtimeSections = [
                ['[Runtime Instruction]', TASKAI_RTC_RUNTIME_INSTRUCTION].join('\n'),
                readInput(inputs, 'projectDocumentSummary')
                    ? ["Here's the project background summary:", readInput(inputs, 'projectDocumentSummary')].join('\n')
                    : '',
                readInput(inputs, 'projectTaskOverview')
                    ? ["Here's all the tasks for this project:", readInput(inputs, 'projectTaskOverview')].join('\n')
                    : '',
                readInput(inputs, 'currentTaskSummary')
                    ? ['The current task we are talking about right now is:', readInput(inputs, 'currentTaskSummary')].join('\n')
                    : '',
            ].filter(Boolean);

            return NextResponse.json({
                success: true,
                data: {
                    promptKey,
                    mode: 'composed_prompt',
                    runtimeUserPrompt: null,
                    composedPrompt: runtimeSections.length
                        ? prependTaskaiRuntimeContext(composedPrompt, runtimeSections.join('\n\n'))
                        : composedPrompt,
                    parsedResult: null,
                },
            });
        }

        let runtimeUserPrompt = '';
        let maxTokens = 2400;

        if (promptKey === 'taskai_ai_chat_summary_prompt') {
            runtimeUserPrompt = buildAiChatSummaryUserPrompt(inputs);
            maxTokens = 2400;
        } else if (promptKey === 'taskai_project_document_summary_prompt') {
            runtimeUserPrompt = buildProjectDocumentSummaryUserPrompt(inputs);
            maxTokens = 2400;
        } else if (promptKey === 'taskai_generate_todos_from_project_and_objective') {
            runtimeUserPrompt = buildGenerateTodosUserPrompt(inputs);
            maxTokens = 2800;
        }

        const parsedResult = await runTaskaiArkJsonPromptWithSystemPrompt<Record<string, unknown>>({
            systemPrompt: content,
            userPrompt: runtimeUserPrompt,
            maxTokens,
        });

        return NextResponse.json({
            success: true,
            data: {
                promptKey,
                mode: 'model_response',
                runtimeUserPrompt,
                composedPrompt: null,
                parsedResult,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_prompt_preview_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
