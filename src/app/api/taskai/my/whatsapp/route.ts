import { requireAuthUser } from '@/lib/taskai/api-auth'
import {
    createWhatsappVerificationRequest,
    defaultNotificationPreferences,
    getLatestUserWhatsAppVerification,
    getUserWhatsAppConnection,
    normalizeWhatsAppNumber,
} from '@/lib/taskai/notifications'
import { supabaseAdmin } from '@/lib/supabase'
import type { TaskaiChannelConnection, TaskaiNotificationPreferences } from '@/types/taskai'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request)
    if (!auth.ok) return auth.response

    try {
        const [connectionResult, verificationResult, prefsResult, jobsResult] = await Promise.all([
            getUserWhatsAppConnection(auth.userId),
            getLatestUserWhatsAppVerification(auth.userId),
            supabaseAdmin
                .from('taskai_notification_preferences')
                .select('*')
                .eq('user_id', auth.userId)
                .eq('channel', 'whatsapp')
                .maybeSingle(),
            supabaseAdmin
                .from('taskai_notification_jobs')
                .select('id, org_id, user_id, task_id, channel, event_type, template_key, dedupe_key, payload, rendered_message, status, scheduled_for, claimed_at, sent_at, failed_at, cancelled_at, retry_count, provider, provider_message_id, error_message, response_payload, created_at, updated_at')
                .eq('user_id', auth.userId)
                .eq('channel', 'whatsapp')
                .order('created_at', { ascending: false })
                .limit(8),
        ])

        if (prefsResult.error) throw prefsResult.error
        if (jobsResult.error) throw jobsResult.error

        return NextResponse.json({
            success: true,
            data: {
                connection: connectionResult,
                verification: verificationResult
                    ? {
                          id: verificationResult.id,
                          phone_number: verificationResult.phone_number,
                          normalized_phone_number: verificationResult.normalized_phone_number,
                          status: verificationResult.status,
                          requested_at: verificationResult.requested_at,
                          expires_at: verificationResult.expires_at,
                          verified_at: verificationResult.verified_at,
                          attempt_count: verificationResult.attempt_count,
                      }
                    : null,
                preferences:
                    (prefsResult.data as TaskaiNotificationPreferences | null) ?? {
                        id: '',
                        user_id: auth.userId,
                        channel: 'whatsapp',
                        ...defaultNotificationPreferences,
                        created_at: '',
                        updated_at: '',
                    },
                recentJobs: jobsResult.data ?? [],
            },
        })
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_whatsapp_settings_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAuthUser(request)
    if (!auth.ok) return auth.response

    let body: {
        phoneNumber?: string | null
        enabled?: boolean
        quietHoursStart?: string | null
        quietHoursEnd?: string | null
        allowNewTask?: boolean
        allowTaskClaimed?: boolean
        allowClaimReminder?: boolean
        allowStalledTask?: boolean
        allowCompletionMessage?: boolean
        allowRankMilestone?: boolean
    } = {}

    try {
        body = (await request.json()) as typeof body
    } catch {
        /* */
    }

    const normalized = normalizeWhatsAppNumber(body.phoneNumber)
    const now = new Date().toISOString()

    if (body.phoneNumber && !normalized) {
        return NextResponse.json(
            {
                success: false,
                error: 'validation',
                message: 'Invalid WhatsApp phone number',
            },
            { status: 400 }
        )
    }

    try {
        const prefsPayload = {
            user_id: auth.userId,
            channel: 'whatsapp',
            enabled: body.enabled ?? true,
            quiet_hours_start: body.quietHoursStart || null,
            quiet_hours_end: body.quietHoursEnd || null,
            allow_new_task: body.allowNewTask ?? true,
            allow_task_claimed: body.allowTaskClaimed ?? true,
            allow_claim_reminder: body.allowClaimReminder ?? true,
            allow_stalled_task: body.allowStalledTask ?? true,
            allow_completion_message: body.allowCompletionMessage ?? true,
            allow_rank_milestone: body.allowRankMilestone ?? true,
            updated_at: now,
        }

        const [{ data: preferences, error: pErr }, currentConnection] = await Promise.all([
            supabaseAdmin
                .from('taskai_notification_preferences')
                .upsert(prefsPayload, { onConflict: 'user_id,channel' })
                .select('*')
                .single(),
            getUserWhatsAppConnection(auth.userId),
        ])

        if (pErr) throw pErr

        let connection: TaskaiChannelConnection | null = currentConnection
        let verification = await getLatestUserWhatsAppVerification(auth.userId)

        if (!normalized) {
            const { data: clearedConnection, error: cErr } = await supabaseAdmin
                .from('taskai_channel_connections')
                .upsert(
                    {
                        user_id: auth.userId,
                        channel: 'whatsapp',
                        phone_number: null,
                        normalized_phone_number: null,
                        status: 'pending',
                        verified_at: null,
                        updated_at: now,
                    },
                    { onConflict: 'user_id,channel' }
                )
                .select('*')
                .single()
            if (cErr) throw cErr
            connection = clearedConnection as TaskaiChannelConnection
            verification = null
        } else {
            const alreadyVerifiedCurrentNumber =
                currentConnection?.status === 'active' && currentConnection.normalized_phone_number === normalized

            if (alreadyVerifiedCurrentNumber) {
                const { data: activeConnection, error: cErr } = await supabaseAdmin
                    .from('taskai_channel_connections')
                    .upsert(
                        {
                            user_id: auth.userId,
                            channel: 'whatsapp',
                            phone_number: body.phoneNumber?.trim() || null,
                            normalized_phone_number: normalized,
                            status: 'active',
                            verified_at: currentConnection?.verified_at ?? now,
                            updated_at: now,
                        },
                        { onConflict: 'user_id,channel' }
                    )
                    .select('*')
                    .single()
                if (cErr) throw cErr
                connection = activeConnection as TaskaiChannelConnection
            } else {
                verification = await createWhatsappVerificationRequest({
                    userId: auth.userId,
                    phoneNumber: body.phoneNumber?.trim() || '',
                    normalizedPhoneNumber: normalized,
                })
                connection = await getUserWhatsAppConnection(auth.userId)
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                connection: connection as TaskaiChannelConnection,
                preferences: preferences as TaskaiNotificationPreferences,
                verification: verification
                    ? {
                          id: verification.id,
                          phone_number: verification.phone_number,
                          normalized_phone_number: verification.normalized_phone_number,
                          status: verification.status,
                          requested_at: verification.requested_at,
                          expires_at: verification.expires_at,
                          verified_at: verification.verified_at,
                          attempt_count: verification.attempt_count,
                      }
                    : null,
            },
        })
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_save_whatsapp_settings_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await requireAuthUser(request)
    if (!auth.ok) return auth.response

    const now = new Date().toISOString()

    try {
        const [
            { error: deleteConnectionError },
            { error: cancelVerificationError },
            { error: cancelVerificationJobsError },
        ] = await Promise.all([
            supabaseAdmin.from('taskai_channel_connections').delete().eq('user_id', auth.userId).eq('channel', 'whatsapp'),
            supabaseAdmin
                .from('taskai_whatsapp_verifications')
                .update({
                    status: 'cancelled',
                    updated_at: now,
                })
                .eq('user_id', auth.userId)
                .eq('channel', 'whatsapp')
                .eq('status', 'pending'),
            supabaseAdmin
                .from('taskai_notification_jobs')
                .update({
                    status: 'cancelled',
                    cancelled_at: now,
                    updated_at: now,
                })
                .eq('user_id', auth.userId)
                .eq('channel', 'whatsapp')
                .eq('event_type', 'binding_verification_code')
                .eq('status', 'queued'),
        ])

        if (deleteConnectionError) throw deleteConnectionError
        if (cancelVerificationError) throw cancelVerificationError
        if (cancelVerificationJobsError) throw cancelVerificationJobsError

        return NextResponse.json({
            success: true,
            data: {
                connection: null,
                verification: null,
            },
        })
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_unbind_whatsapp_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
