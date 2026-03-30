import { requireAuthUser } from '@/lib/taskai/api-auth';
import {
    TASKAI_PROMPT_KEYS,
    getDefaultTaskaiPromptTemplate,
    invalidateTaskaiPromptTemplateCache,
    listTaskaiPromptTemplates,
} from '@/lib/taskai/prompt-templates';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import type { TaskaiPromptKey, TaskaiPromptVersion } from '@/types/taskai';
import { NextRequest, NextResponse } from 'next/server';

function isMissingPromptTable(error: unknown) {
    const code = typeof error === 'object' && error !== null ? String((error as { code?: string }).code ?? '') : '';
    const message =
        typeof error === 'object' && error !== null ? String((error as { message?: string }).message ?? '') : '';
    return (
        code === '42P01'
        || message.toLowerCase().includes('taskai_prompt_templates')
        || message.toLowerCase().includes('taskai_prompt_template_versions')
    );
}

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

    return { ok: true as const, userId: auth.userId, orgId };
}

async function listPromptVersions(): Promise<TaskaiPromptVersion[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('taskai_prompt_template_versions')
            .select('id, prompt_key, content, result_source, action, created_at, created_by, restored_from_version_id')
            .in('prompt_key', TASKAI_PROMPT_KEYS)
            .order('created_at', { ascending: false })
            .limit(60);

        if (error) throw error;
        return (data ?? []) as TaskaiPromptVersion[];
    } catch (error) {
        if (isMissingPromptTable(error)) {
            return [];
        }
        throw error;
    }
}

async function createPromptVersion(params: {
    promptKey: TaskaiPromptKey;
    content: string;
    resultSource: 'default' | 'database';
    action: 'saved' | 'reset_to_default' | 'rolled_back';
    createdBy: string;
    restoredFromVersionId?: string | null;
}) {
    const { error } = await supabaseAdmin.from('taskai_prompt_template_versions').insert({
        prompt_key: params.promptKey,
        content: params.content,
        result_source: params.resultSource,
        action: params.action,
        created_by: params.createdBy,
        restored_from_version_id: params.restoredFromVersionId ?? null,
    });
    if (error) throw error;
}

async function buildPromptAdminPayload() {
    const [prompts, versions] = await Promise.all([listTaskaiPromptTemplates({ force: true }), listPromptVersions()]);
    return { prompts, versions };
}

export async function GET(request: NextRequest) {
    const access = await requireOwnerAccess(request);
    if (!access.ok) return access.response;

    try {
        const data = await buildPromptAdminPayload();
        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_admin_prompts_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const access = await requireOwnerAccess(request);
    if (!access.ok) return access.response;

    let body: { promptKey?: TaskaiPromptKey; content?: string } = {};
    try {
        body = (await request.json()) as { promptKey?: TaskaiPromptKey; content?: string };
    } catch {
        /* */
    }

    const promptKey = body.promptKey;
    const content = body.content?.trim();
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
        const defaultPrompt = getDefaultTaskaiPromptTemplate(promptKey);
        const { error } = await supabaseAdmin.from('taskai_prompt_templates').upsert(
            {
                prompt_key: defaultPrompt.prompt_key,
                content,
                updated_by: access.userId,
            },
            { onConflict: 'prompt_key' }
        );
        if (error) throw error;

        await createPromptVersion({
            promptKey,
            content,
            resultSource: 'database',
            action: 'saved',
            createdBy: access.userId,
        });

        invalidateTaskaiPromptTemplateCache();
        const data = await buildPromptAdminPayload();
        return NextResponse.json({ success: true, data });
    } catch (e) {
        const message =
            isMissingPromptTable(e)
                ? 'Prompt tables are missing. Please run docs/db/2026-03-30_add_taskai_prompt_templates.sql and docs/db/2026-03-30_add_taskai_prompt_template_versions.sql first.'
                : e instanceof Error
                  ? e.message
                  : 'Unknown error';
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_save_admin_prompt_failed',
                message,
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const access = await requireOwnerAccess(request);
    if (!access.ok) return access.response;

    const promptKey = request.nextUrl.searchParams.get('promptKey');
    if (!promptKey) {
        return NextResponse.json({ success: false, message: 'promptKey required' }, { status: 400 });
    }
    if (!isValidPromptKey(promptKey)) {
        return NextResponse.json({ success: false, message: 'Unknown promptKey' }, { status: 400 });
    }

    try {
        const defaultPrompt = getDefaultTaskaiPromptTemplate(promptKey);
        const { error } = await supabaseAdmin.from('taskai_prompt_templates').delete().eq('prompt_key', promptKey);
        if (error) throw error;

        await createPromptVersion({
            promptKey,
            content: defaultPrompt.content,
            resultSource: 'default',
            action: 'reset_to_default',
            createdBy: access.userId,
        });

        invalidateTaskaiPromptTemplateCache();
        const data = await buildPromptAdminPayload();
        return NextResponse.json({ success: true, data });
    } catch (e) {
        const message =
            isMissingPromptTable(e)
                ? 'Prompt tables are missing. Please run docs/db/2026-03-30_add_taskai_prompt_templates.sql and docs/db/2026-03-30_add_taskai_prompt_template_versions.sql first.'
                : e instanceof Error
                  ? e.message
                  : 'Unknown error';
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_reset_admin_prompt_failed',
                message,
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    const access = await requireOwnerAccess(request);
    if (!access.ok) return access.response;

    let body: { promptKey?: TaskaiPromptKey; versionId?: string } = {};
    try {
        body = (await request.json()) as { promptKey?: TaskaiPromptKey; versionId?: string };
    } catch {
        /* */
    }

    const promptKey = body.promptKey;
    const versionId = body.versionId?.trim();
    if (!promptKey || !versionId) {
        return NextResponse.json(
            { success: false, message: 'promptKey and versionId are required' },
            { status: 400 }
        );
    }
    if (!isValidPromptKey(promptKey)) {
        return NextResponse.json({ success: false, message: 'Unknown promptKey' }, { status: 400 });
    }

    try {
        const { data: version, error } = await supabaseAdmin
            .from('taskai_prompt_template_versions')
            .select('id, prompt_key, content, result_source, action, created_at, created_by, restored_from_version_id')
            .eq('id', versionId)
            .eq('prompt_key', promptKey)
            .single();
        if (error) throw error;
        if (!version) {
            return NextResponse.json({ success: false, message: 'Version not found' }, { status: 404 });
        }

        if (version.result_source === 'default') {
            const { error: deleteError } = await supabaseAdmin
                .from('taskai_prompt_templates')
                .delete()
                .eq('prompt_key', promptKey);
            if (deleteError) throw deleteError;
        } else {
            const { error: upsertError } = await supabaseAdmin.from('taskai_prompt_templates').upsert(
                {
                    prompt_key: promptKey,
                    content: version.content,
                    updated_by: access.userId,
                },
                { onConflict: 'prompt_key' }
            );
            if (upsertError) throw upsertError;
        }

        await createPromptVersion({
            promptKey,
            content: version.content,
            resultSource: version.result_source,
            action: 'rolled_back',
            createdBy: access.userId,
            restoredFromVersionId: version.id,
        });

        invalidateTaskaiPromptTemplateCache();
        const data = await buildPromptAdminPayload();
        return NextResponse.json({ success: true, data });
    } catch (e) {
        const message =
            isMissingPromptTable(e)
                ? 'Prompt tables are missing. Please run docs/db/2026-03-30_add_taskai_prompt_templates.sql and docs/db/2026-03-30_add_taskai_prompt_template_versions.sql first.'
                : e instanceof Error
                  ? e.message
                  : 'Unknown error';
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_rollback_admin_prompt_failed',
                message,
            },
            { status: 500 }
        );
    }
}
