import { requireBridgeToken } from '@/lib/taskai/notifications'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
    try {
        requireBridgeToken(request)

        const { jobId } = await ctx.params
        if (!jobId) {
            return NextResponse.json({ success: false, message: 'jobId required' }, { status: 400 })
        }

        const body = (await request.json().catch(() => ({}))) as {
            status?: 'sent' | 'failed'
            providerMessageId?: string
            errorMessage?: string
            responsePayload?: Record<string, unknown>
        }

        if (body.status !== 'sent' && body.status !== 'failed') {
            return NextResponse.json(
                { success: false, message: 'status must be sent or failed' },
                { status: 400 }
            )
        }

        const now = new Date().toISOString()
        const { data, error } = await supabaseAdmin
            .from('taskai_notification_jobs')
            .update({
                status: body.status,
                sent_at: body.status === 'sent' ? now : null,
                failed_at: body.status === 'failed' ? now : null,
                provider_message_id: body.providerMessageId ?? null,
                error_message: body.errorMessage ?? null,
                response_payload: body.responsePayload ?? {},
                updated_at: now,
                retry_count: body.status === 'failed' ? 1 : 0,
            })
            .eq('id', jobId)
            .eq('status', 'sending')
            .select('*')
            .maybeSingle()

        if (error) throw error
        if (!data) {
            return NextResponse.json(
                { success: false, message: 'job not found or not in sending status' },
                { status: 409 }
            )
        }

        return NextResponse.json({ success: true, data: { job: data } })
    } catch (e) {
        const status = typeof (e as { status?: number })?.status === 'number' ? (e as { status: number }).status : 500
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_report_bridge_job_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status }
        )
    }
}
