import { requireAuthUser } from '@/lib/taskai/api-auth';
import { requireTaskAccess } from '@/lib/taskai/task-access';
import { TASKAI_EVIDENCE_BUCKET } from '@/lib/taskai/task-evidence';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/tasks/[taskId]/records - 根据 taskId 获取 summary + conversations */
export async function GET(request: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await ctx.params;
    if (!taskId) return NextResponse.json({ success: false, message: 'taskId required' }, { status: 400 });

    const access = await requireTaskAccess(auth.userId, taskId);
    if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

    try {
        const [{ data: summary, error: summaryErr }, { data: conversations, error: convErr }, { data: evidence, error: evidenceErr }] = await Promise.all([
            supabaseAdmin
                .from('taskai_task_summaries')
                .select('id, task_id, org_id, generated_by, summary, key_points, generated_at, updated_at')
                .eq('task_id', taskId)
                .maybeSingle(),
            supabaseAdmin
                .from('taskai_task_conversations')
                .select('id, task_id, org_id, user_id, user_message_text, ai_response_text, user_sent_at, ai_responded_at, created_at')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true }),
            supabaseAdmin
                .from('taskai_task_completion_evidence')
                .select('id, task_id, org_id, user_id, evidence_type, text_content, file_name, mime_type, storage_bucket, storage_path, file_size, created_at, updated_at')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false }),
        ]);

        if (summaryErr) throw summaryErr;
        if (convErr) throw convErr;
        if (evidenceErr) throw evidenceErr;

        const evidenceWithUrls = await Promise.all(
            (evidence ?? []).map(async (item) => {
                if (
                    item.evidence_type !== 'file' ||
                    !item.storage_bucket ||
                    !item.storage_path
                ) {
                    return { ...item, view_url: null };
                }

                const bucket = item.storage_bucket || TASKAI_EVIDENCE_BUCKET;
                const { data: signedUrlData } = await supabaseAdmin.storage
                    .from(bucket)
                    .createSignedUrl(item.storage_path, 60 * 60);

                return {
                    ...item,
                    view_url: signedUrlData?.signedUrl ?? null,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                taskId,
                task: access.task,
                summary: summary ?? null,
                conversations: conversations ?? [],
                evidence: evidenceWithUrls,
            },
        });
    } catch (e) {
        console.error('GET task records', e);
        return NextResponse.json(
            { success: false, error: 'taskai_fetch_task_records_failed', message: e instanceof Error ? e.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
