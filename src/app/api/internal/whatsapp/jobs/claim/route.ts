import { getUserNotificationPreferences, getUserWhatsAppConnection, requireBridgeToken } from '@/lib/taskai/notifications'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        requireBridgeToken(request)

        const { data: jobs, error } = await supabaseAdmin
            .from('taskai_notification_jobs')
            .select('*')
            .eq('channel', 'whatsapp')
            .eq('status', 'queued')
            .lte('scheduled_for', new Date().toISOString())
            .order('scheduled_for', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(20)

        if (error) throw error

        for (const job of jobs ?? []) {
            const eventType = job.event_type as string
            const payload = (job.payload ?? {}) as Record<string, unknown>
            const payloadPhoneNumber = String(payload.normalized_phone_number ?? payload.phone_number ?? '').trim()

            if (eventType === 'binding_verification_code') {
                if (!payloadPhoneNumber) {
                    await supabaseAdmin
                        .from('taskai_notification_jobs')
                        .update({
                            status: 'skipped',
                            error_message: 'Missing verification phone number',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', job.id)
                        .eq('status', 'queued')
                    continue
                }

                const now = new Date().toISOString()
                const { data: claimed, error: claimError } = await supabaseAdmin
                    .from('taskai_notification_jobs')
                    .update({
                        status: 'sending',
                        claimed_at: now,
                        updated_at: now,
                    })
                    .eq('id', job.id)
                    .eq('status', 'queued')
                    .select('*')
                    .maybeSingle()

                if (claimError) throw claimError
                if (!claimed) continue

                return NextResponse.json({
                    success: true,
                    data: {
                        job: claimed,
                        recipient: {
                            phoneNumber: payloadPhoneNumber,
                        },
                    },
                })
            }

            const [connection, preferences] = await Promise.all([
                getUserWhatsAppConnection(job.user_id as string),
                getUserNotificationPreferences(job.user_id as string),
            ])

            if (!connection || connection.status !== 'active' || !connection.normalized_phone_number) {
                await supabaseAdmin
                    .from('taskai_notification_jobs')
                    .update({
                        status: 'skipped',
                        error_message: 'No active WhatsApp connection',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', job.id)
                    .eq('status', 'queued')
                continue
            }

            if (preferences && !preferences.enabled) {
                await supabaseAdmin
                    .from('taskai_notification_jobs')
                    .update({
                        status: 'skipped',
                        error_message: 'Notifications disabled by user preference',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', job.id)
                    .eq('status', 'queued')
                continue
            }

            const now = new Date().toISOString()
            const { data: claimed, error: claimError } = await supabaseAdmin
                .from('taskai_notification_jobs')
                .update({
                    status: 'sending',
                    claimed_at: now,
                    updated_at: now,
                })
                .eq('id', job.id)
                .eq('status', 'queued')
                .select('*')
                .maybeSingle()

            if (claimError) throw claimError
            if (!claimed) continue

            return NextResponse.json({
                success: true,
                data: {
                    job: claimed,
                    recipient: {
                        phoneNumber: connection.normalized_phone_number,
                    },
                },
            })
        }

        return NextResponse.json({ success: true, data: { job: null } })
    } catch (e) {
        const status = typeof (e as { status?: number })?.status === 'number' ? (e as { status: number }).status : 500
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_claim_bridge_job_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status }
        )
    }
}
