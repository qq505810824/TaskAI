import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; documentId: string }> }
) {
    const { orgId, documentId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const { data: document, error: fetchError } = await supabaseAdmin
            .from('taskai_context_documents')
            .select('id, org_id, storage_bucket, storage_path')
            .eq('id', documentId)
            .eq('org_id', orgId)
            .single();
        if (fetchError) throw fetchError;

        const { error: deleteError } = await supabaseAdmin
            .from('taskai_context_documents')
            .delete()
            .eq('id', documentId)
            .eq('org_id', orgId);
        if (deleteError) throw deleteError;

        if (document.storage_bucket && document.storage_path) {
            await supabaseAdmin.storage.from(document.storage_bucket).remove([document.storage_path]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_delete_context_document_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
