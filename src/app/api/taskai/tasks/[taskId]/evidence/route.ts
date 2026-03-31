import { requireAuthUser } from '@/lib/taskai/api-auth';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { TASKAI_EVIDENCE_BUCKET, sanitizeTaskaiStoragePathPart } from '@/lib/taskai/task-evidence';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function canWriteEvidence(task: { assignee_user_id: string | null; status: string }, userId: string) {
    return task.assignee_user_id === userId && task.status === 'in_progress';
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) {
        return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });
    }

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });
    if (!canWriteEvidence(access.task, auth.userId)) {
        return NextResponse.json(
            { success: false, message: 'Only the active assignee can add completion evidence while the task is in progress.' },
            { status: 403 }
        );
    }

    try {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await request.json();
            const textContent = String(body?.textContent || '').trim();
            if (!textContent) {
                return NextResponse.json({ success: false, message: 'Evidence text is required.' }, { status: 400 });
            }

            const { data, error } = await supabaseAdmin
                .from('taskai_task_completion_evidence')
                .insert({
                    task_id: access.task.id,
                    org_id: access.task.org_id,
                    user_id: auth.userId,
                    evidence_type: 'text',
                    text_content: textContent,
                })
                .select(
                    'id, task_id, org_id, user_id, evidence_type, text_content, file_name, mime_type, storage_bucket, storage_path, file_size, created_at, updated_at'
                )
                .single();

            if (error) throw error;

            return NextResponse.json({ success: true, data: { evidence: { ...data, view_url: null } } }, { status: 201 });
        }

        const form = await request.formData();
        const file = form.get('file');

        if (!(file instanceof Blob)) {
            return NextResponse.json({ success: false, message: 'A file is required.' }, { status: 400 });
        }

        const rawFileName = 'name' in file && typeof file.name === 'string' ? file.name : 'evidence';
        const fileName = rawFileName.trim() || 'evidence';
        const mimeType = file.type?.trim() || 'application/octet-stream';
        const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : 'bin';
        const filePath = `taskai/task-evidence/${sanitizeTaskaiStoragePathPart(access.task.org_id)}/${sanitizeTaskaiStoragePathPart(
            taskId
        )}/${Date.now()}_${sanitizeTaskaiStoragePathPart(fileName.replace(/\.[^.]+$/, ''))}.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage.from(TASKAI_EVIDENCE_BUCKET).upload(filePath, file, {
            contentType: mimeType,
            upsert: false,
        });
        if (uploadError) {
            throw new Error(`Evidence upload failed: ${uploadError.message}`);
        }

        const { data, error } = await supabaseAdmin
            .from('taskai_task_completion_evidence')
            .insert({
                task_id: access.task.id,
                org_id: access.task.org_id,
                user_id: auth.userId,
                evidence_type: 'file',
                file_name: fileName,
                mime_type: mimeType,
                storage_bucket: TASKAI_EVIDENCE_BUCKET,
                storage_path: filePath,
                file_size: typeof file.size === 'number' ? file.size : null,
            })
            .select(
                'id, task_id, org_id, user_id, evidence_type, text_content, file_name, mime_type, storage_bucket, storage_path, file_size, created_at, updated_at'
            )
            .single();

        if (error) throw error;

        const { data: signedUrlData } = await supabaseAdmin.storage
            .from(TASKAI_EVIDENCE_BUCKET)
            .createSignedUrl(filePath, 60 * 60);

        return NextResponse.json(
            { success: true, data: { evidence: { ...data, view_url: signedUrlData?.signedUrl ?? null } } },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_save_completion_evidence_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
