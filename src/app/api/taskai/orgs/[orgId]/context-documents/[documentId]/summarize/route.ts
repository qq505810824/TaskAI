import { summarizeTaskaiContextDocument } from '@/lib/taskai/task-generation';
import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; documentId: string }> }
) {
    const { orgId, documentId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const { data: document, error } = await supabaseAdmin
            .from('taskai_context_documents')
            .select('*')
            .eq('id', documentId)
            .eq('org_id', orgId)
            .single();
        if (error) throw error;

        if (!document.raw_text?.trim()) {
            return NextResponse.json(
                { success: false, message: 'Document raw_text is empty, cannot summarize.' },
                { status: 400 }
            );
        }

        await supabaseAdmin
            .from('taskai_context_documents')
            .update({ summary_status: 'processing', summary_error: null })
            .eq('id', documentId);

        let projectObjective: string | null = null;
        if (document.project_id) {
            const { data: project, error: projectError } = await supabaseAdmin
                .from('taskai_projects')
                .select('objective')
                .eq('id', document.project_id)
                .eq('org_id', orgId)
                .maybeSingle();

            if (projectError) throw projectError;
            projectObjective = String(project?.objective ?? '').trim() || null;
        }

        const result = await summarizeTaskaiContextDocument({
            documentTitle: document.title,
            documentScope: document.scope,
            projectName: document.project_name,
            projectObjective,
            rawDocumentText: document.raw_text,
        });

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('taskai_context_documents')
            .update({
                summary: result.summary,
                summary_payload: result,
                summary_status: 'ready',
                summary_error: null,
            })
            .eq('id', documentId)
            .select('*')
            .single();
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, data: { document: updated, summary: result } });
    } catch (error) {
        await supabaseAdmin
            .from('taskai_context_documents')
            .update({
                summary_status: 'failed',
                summary_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', documentId);

        return NextResponse.json(
            {
                success: false,
                error: 'taskai_summarize_context_document_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
