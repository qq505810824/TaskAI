import { extractRawTextFromUpload, sanitizePathPart } from '@/lib/taskai/context-documents';
import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { summarizeTaskaiContextDocument } from '@/lib/taskai/task-generation';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const DOC_BUCKET = process.env.SUPABASE_STORAGE_TASKAI_CONTEXT_DOC_BUCKET?.trim() || 'taskai-context-docs';

export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const { orgId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    const projectId = request.nextUrl.searchParams.get('projectId');

    try {
        let query = supabaseAdmin
            .from('taskai_context_documents')
            .select('*')
            .eq('org_id', orgId)
            .order('updated_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, data: { documents: data ?? [] } });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_context_documents_failed',
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

    let insertedDocumentId: string | null = null;
    try {
        const form = await request.formData();
        const file = form.get('file');
        const titleInput = String(form.get('title') || '').trim();
        const projectId = String(form.get('projectId') || '').trim() || null;
        const scopeInput = String(form.get('scope') || '').trim();
        const projectName = String(form.get('projectName') || '').trim() || null;
        const contentText = String(form.get('contentText') || '').trim() || null;

        if (!(file instanceof Blob)) {
            return NextResponse.json({ success: false, message: 'file required' }, { status: 400 });
        }

        const rawFileName = 'name' in file && typeof file.name === 'string' ? file.name : 'document.txt';
        const fileName = rawFileName.trim() || 'document.txt';
        const title = titleInput || fileName.replace(/\.[^.]+$/, '');
        const scope = scopeInput === 'project' || scopeInput === 'objective' ? scopeInput : 'organization';
        const fileSize = typeof file.size === 'number' ? file.size : null;
        const mimeType = file.type?.trim() || null;
        const rawText = await extractRawTextFromUpload({ file, fileName, mimeType, contentText });
        let projectObjective: string | null = null;
        let resolvedProjectName = projectName;

        if (projectId) {
            const { data: project, error: projectError } = await supabaseAdmin
                .from('taskai_projects')
                .select('name, objective')
                .eq('id', projectId)
                .eq('org_id', orgId)
                .maybeSingle();

            if (projectError) throw projectError;
            if (!project) {
                return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
            }

            projectObjective = String(project.objective ?? '').trim() || null;
            resolvedProjectName = String(project.name ?? '').trim() || resolvedProjectName;
        }

        const safeOrgId = sanitizePathPart(orgId);
        const safeUploaderId = sanitizePathPart(access.userId);
        const safeFileName = sanitizePathPart(fileName.replace(/\.[^.]+$/, ''));
        const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : 'txt';
        const filePath = `taskai/context-documents/${safeOrgId}/${safeUploaderId}/${Date.now()}_${safeFileName}.${extension}`;

        const { error: uploadError } = await supabaseAdmin.storage.from(DOC_BUCKET).upload(filePath, file, {
            contentType: mimeType || 'application/octet-stream',
            upsert: false,
        });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data, error } = await supabaseAdmin
            .from('taskai_context_documents')
            .insert({
                org_id: orgId,
                project_id: projectId,
                scope,
                project_name: resolvedProjectName,
                title,
                file_name: fileName,
                mime_type: mimeType,
                storage_bucket: DOC_BUCKET,
                storage_path: filePath,
                file_size: fileSize,
                raw_text: rawText,
                summary: null,
                summary_payload: {},
                summary_status: 'processing',
                summary_error: null,
                uploaded_by: access.userId,
            })
            .select('*')
            .single();

        if (error) throw error;
        insertedDocumentId = data.id;

        const summaryResult = await summarizeTaskaiContextDocument({
            documentTitle: data.title,
            documentScope: data.scope,
            projectName: data.project_name,
            projectObjective,
            rawDocumentText: data.raw_text ?? '',
        });

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('taskai_context_documents')
            .update({
                summary: summaryResult.summary,
                summary_payload: summaryResult,
                summary_status: 'ready',
                summary_error: null,
            })
            .eq('id', data.id)
            .select('*')
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, data: { document: updated } }, { status: 201 });
    } catch (error) {
        if (insertedDocumentId) {
            await supabaseAdmin
                .from('taskai_context_documents')
                .update({
                    summary_status: 'failed',
                    summary_error: error instanceof Error ? error.message : 'Unknown error',
                })
                .eq('id', insertedDocumentId);
        }

        return NextResponse.json(
            {
                success: false,
                error: 'taskai_upload_context_document_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
