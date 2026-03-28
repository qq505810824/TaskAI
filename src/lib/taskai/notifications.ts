import { getBearerToken } from '@/lib/taskai/api-auth'
import type {
    TaskaiChannelConnection,
    TaskaiNotificationChannel,
    TaskaiNotificationEventType,
    TaskaiNotificationJob,
    TaskaiNotificationPreferences,
    TaskaiWhatsappVerification,
} from '@/types/taskai'
import { supabaseAdmin } from '@/lib/supabase'
import type { NextRequest } from 'next/server'

const DEFAULT_CHANNEL: TaskaiNotificationChannel = 'whatsapp'

type NotificationMessageContext = {
    firstName?: string | null
    verificationCode?: string | null
    taskTitle?: string | null
    points?: number | null
    orgName?: string | null
    taskUrl?: string | null
    workspaceUrl?: string | null
    leaderboardUrl?: string | null
    summaryUrl?: string | null
    totalPoints?: number | null
    rank?: number | null
    previousRank?: number | null
    milestone?: number | null
}

type VerificationReplyResult = {
    handled: boolean
    verified: boolean
    replyMessage?: string
    verification?: TaskaiWhatsappVerification | null
}

export function normalizeWhatsAppNumber(input: string | null | undefined): string | null {
    const value = (input ?? '').trim()
    if (!value) return null
    const normalized = value.replace(/[^\d]/g, '')
    if (normalized.length < 8) return null
    return normalized
}

export const defaultNotificationPreferences = {
    enabled: true,
    quiet_hours_start: null as string | null,
    quiet_hours_end: null as string | null,
    allow_new_task: true,
    allow_task_claimed: true,
    allow_claim_reminder: true,
    allow_stalled_task: true,
    allow_completion_message: true,
    allow_rank_milestone: true,
}

export function renderNotificationMessage(
    eventType: TaskaiNotificationEventType,
    context: NotificationMessageContext
): { templateKey: string; message: string } {
    const firstName = context.firstName?.trim() || 'there'
    const verificationCode = context.verificationCode?.trim() || '------'
    const taskTitle = context.taskTitle?.trim() || 'your task'
    const points = context.points ?? 0
    const taskUrl = context.taskUrl?.trim() || ''
    const workspaceUrl = context.workspaceUrl?.trim() || taskUrl
    const leaderboardUrl = context.leaderboardUrl?.trim() || taskUrl
    const summaryUrl = context.summaryUrl?.trim() || taskUrl
    const totalPoints = context.totalPoints ?? 0
    const rank = context.rank ?? 0
    const previousRank = context.previousRank ?? 0
    const milestone = context.milestone ?? 0
    const orgName = context.orgName?.trim() || 'your team'

    switch (eventType) {
        case 'task_new_available':
            return {
                templateKey: 'task_new_available_v1',
                message: `📋 Hi ${firstName}, a new task is available in ${orgName}: ${taskTitle}.\nComplete it to earn ${points} points.\n${taskUrl}`,
            }
        case 'task_claimed':
            return {
                templateKey: 'task_claimed_v1',
                message: `✅ Hi ${firstName}, you successfully claimed ${taskTitle}.\nStart working with AI here whenever you are ready:\n${workspaceUrl}`,
            }
        case 'task_claimed_no_ai_started':
            return {
                templateKey: 'task_claimed_no_ai_started_v1',
                message: `🤖 Hi ${firstName}, you already picked up ${taskTitle}.\nRemember to start chatting with AI so you can move the task forward:\n${workspaceUrl}`,
            }
        case 'task_claimed_stalled':
            return {
                templateKey: 'task_claimed_stalled_v1',
                message: `⏰ Just a reminder, ${taskTitle} is still waiting for your next step.\nYou can jump back into the AI workspace here:\n${workspaceUrl}`,
            }
        case 'task_completed_encourage':
            return {
                templateKey: 'task_completed_encourage_v1',
                message: `🎉 Great job, ${firstName}! You completed ${taskTitle}.\nYou earned ${points} points and now have ${totalPoints} points.\n${summaryUrl ? `Review your result here:\n${summaryUrl}` : 'Keep the momentum going!'}`,
            }
        case 'leaderboard_rank_up':
            return {
                templateKey: 'leaderboard_rank_up_v1',
                message: `📈 You just moved up from #${previousRank} to #${rank} on the leaderboard.\nSee your standing here:\n${leaderboardUrl}`,
            }
        case 'points_milestone':
            return {
                templateKey: 'points_milestone_v1',
                message: `🌟 You reached ${milestone} points!\nThat is a strong milestone. See your standing here:\n${leaderboardUrl}`,
            }
        case 'test_message':
            return {
                templateKey: 'test_message_v1',
                message: `✅ This is a TaskAI WhatsApp test message.\nYour notification setup is working on this device.`,
            }
        case 'binding_verification_code':
            return {
                templateKey: 'binding_verification_code_v1',
                message: `🔐 TaskAI verification code: ${verificationCode}\nReply from this WhatsApp number with "TASKAI ${verificationCode}" to finish linking your account.\nThis code expires in 10 minutes.`,
            }
        default:
            return {
                templateKey: 'fallback_v1',
                message: `TaskAI notification`,
            }
    }
}

export async function getUserWhatsAppConnection(userId: string): Promise<TaskaiChannelConnection | null> {
    const { data, error } = await supabaseAdmin
        .from('taskai_channel_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('channel', DEFAULT_CHANNEL)
        .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as TaskaiChannelConnection | null) ?? null
}

export async function getUserNotificationPreferences(userId: string): Promise<TaskaiNotificationPreferences | null> {
    const { data, error } = await supabaseAdmin
        .from('taskai_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('channel', DEFAULT_CHANNEL)
        .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as TaskaiNotificationPreferences | null) ?? null
}

export async function getLatestUserWhatsAppVerification(userId: string): Promise<TaskaiWhatsappVerification | null> {
    const { data, error } = await supabaseAdmin
        .from('taskai_whatsapp_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('channel', DEFAULT_CHANNEL)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as TaskaiWhatsappVerification | null) ?? null
}

async function saveUserWhatsAppConnection(params: {
    userId: string
    phoneNumber: string | null
    normalizedPhoneNumber: string | null
    status: 'pending' | 'active' | 'paused' | 'revoked'
    verifiedAt?: string | null
    lastSeenAt?: string | null
    updatedAt: string
}) {
    const { data, error } = await supabaseAdmin
        .from('taskai_channel_connections')
        .upsert(
            {
                user_id: params.userId,
                channel: DEFAULT_CHANNEL,
                phone_number: params.phoneNumber,
                normalized_phone_number: params.normalizedPhoneNumber,
                status: params.status,
                verified_at: params.verifiedAt ?? null,
                last_seen_at: params.lastSeenAt ?? null,
                updated_at: params.updatedAt,
            },
            { onConflict: 'user_id,channel' }
        )
        .select('*')
        .single()

    if (error) throw new Error(error.message)
    return data as TaskaiChannelConnection
}

export async function getUserDisplayInfo(userId: string) {
    const { data, error } = await supabaseAdmin.from('users').select('id, name, email').eq('id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    return data
}

export function eventEnabledByPreferences(
    preferences: TaskaiNotificationPreferences | null,
    eventType: TaskaiNotificationEventType
) {
    if (eventType === 'binding_verification_code') return true

    const prefs = preferences ?? ({
        ...defaultNotificationPreferences,
        id: '',
        user_id: '',
        channel: DEFAULT_CHANNEL,
        created_at: '',
        updated_at: '',
    } as TaskaiNotificationPreferences)

    if (!prefs.enabled) return false

    switch (eventType) {
        case 'task_new_available':
            return prefs.allow_new_task
        case 'task_claimed':
            return prefs.allow_task_claimed
        case 'task_claimed_no_ai_started':
            return prefs.allow_claim_reminder
        case 'task_claimed_stalled':
            return prefs.allow_stalled_task
        case 'task_completed_encourage':
        case 'test_message':
            return prefs.allow_completion_message
        case 'leaderboard_rank_up':
        case 'points_milestone':
            return prefs.allow_rank_milestone
        default:
            return true
    }
}

export async function enqueueNotificationJob(params: {
    orgId?: string | null
    userId: string
    taskId?: string | null
    eventType: TaskaiNotificationEventType
    dedupeKey: string
    scheduledFor?: string
    context: NotificationMessageContext
    payload?: Record<string, unknown>
    overridePhoneNumber?: string | null
    overrideNormalizedPhoneNumber?: string | null
    bypassPreferenceCheck?: boolean
    allowPendingConnection?: boolean
}) {
    const [connection, preferences] = await Promise.all([
        getUserWhatsAppConnection(params.userId),
        getUserNotificationPreferences(params.userId),
    ])

    const payloadPhoneNumber = params.overridePhoneNumber ?? connection?.phone_number ?? null
    const payloadNormalizedPhoneNumber =
        params.overrideNormalizedPhoneNumber ?? connection?.normalized_phone_number ?? null

    const canUseConnection =
        !!connection &&
        !!payloadNormalizedPhoneNumber &&
        (connection.status === 'active' || (params.allowPendingConnection && connection.status === 'pending'))

    if (!canUseConnection && (!payloadPhoneNumber || !payloadNormalizedPhoneNumber)) {
        return { ok: false as const, reason: 'no_active_whatsapp_connection' }
    }

    if (!params.bypassPreferenceCheck && !eventEnabledByPreferences(preferences, params.eventType)) {
        return { ok: false as const, reason: 'preference_disabled' }
    }

    const { templateKey, message } = renderNotificationMessage(params.eventType, params.context)
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
        .from('taskai_notification_jobs')
        .insert({
            org_id: params.orgId ?? null,
            user_id: params.userId,
            task_id: params.taskId ?? null,
            channel: DEFAULT_CHANNEL,
            event_type: params.eventType,
            template_key: templateKey,
            dedupe_key: params.dedupeKey,
            payload: {
                ...params.payload,
                phone_number: payloadPhoneNumber,
                normalized_phone_number: payloadNormalizedPhoneNumber,
            },
            rendered_message: message,
            status: 'queued',
            scheduled_for: params.scheduledFor ?? now,
            provider: 'openclaw-whatsapp',
            created_at: now,
            updated_at: now,
        })
        .select('*')
        .single()

    if (error) {
        if (error.code === '23505') {
            return { ok: false as const, reason: 'duplicate_job' }
        }
        throw new Error(error.message)
    }

    return { ok: true as const, job: data as TaskaiNotificationJob }
}

export async function cancelPendingNotificationJobs(params: {
    userId: string
    taskId: string
    eventTypes: TaskaiNotificationEventType[]
}) {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
        .from('taskai_notification_jobs')
        .update({
            status: 'cancelled',
            cancelled_at: now,
            updated_at: now,
        })
        .eq('user_id', params.userId)
        .eq('task_id', params.taskId)
        .in('event_type', params.eventTypes)
        .eq('status', 'queued')

    if (error) throw new Error(error.message)
}

export function generateWhatsappVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000))
}

export function maskWhatsappPhone(phone: string | null | undefined) {
    const normalized = normalizeWhatsAppNumber(phone)
    if (!normalized) return ''
    if (normalized.length <= 4) return normalized
    return `${normalized.slice(0, Math.max(0, normalized.length - 4)).replace(/\d/g, '*')}${normalized.slice(-4)}`
}

export function extractWhatsappDigitsFromJid(jid: string | null | undefined) {
    const raw = (jid ?? '').trim()
    if (!raw) return null
    const head = raw.split('@')[0] ?? ''
    return normalizeWhatsAppNumber(head)
}

export async function createWhatsappVerificationRequest(params: {
    userId: string
    phoneNumber: string
    normalizedPhoneNumber: string
}) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString()
    const requestedAt = now.toISOString()
    const verificationCode = generateWhatsappVerificationCode()

    await supabaseAdmin
        .from('taskai_whatsapp_verifications')
        .update({
            status: 'cancelled',
            updated_at: requestedAt,
        })
        .eq('user_id', params.userId)
        .eq('channel', DEFAULT_CHANNEL)
        .eq('status', 'pending')

    const { data: verification, error } = await supabaseAdmin
        .from('taskai_whatsapp_verifications')
        .insert({
            user_id: params.userId,
            channel: DEFAULT_CHANNEL,
            phone_number: params.phoneNumber,
            normalized_phone_number: params.normalizedPhoneNumber,
            verification_code: verificationCode,
            status: 'pending',
            requested_at: requestedAt,
            expires_at: expiresAt,
            created_at: requestedAt,
            updated_at: requestedAt,
        })
        .select('*')
        .single()

    if (error) throw new Error(error.message)

    await saveUserWhatsAppConnection({
        userId: params.userId,
        phoneNumber: params.phoneNumber,
        normalizedPhoneNumber: params.normalizedPhoneNumber,
        status: 'pending',
        verifiedAt: null,
        lastSeenAt: null,
        updatedAt: requestedAt,
    })

    await enqueueNotificationJob({
        userId: params.userId,
        eventType: 'binding_verification_code',
        dedupeKey: `whatsapp:binding_verification_code:${(verification as TaskaiWhatsappVerification).id}`,
        context: {
            verificationCode,
        },
        payload: {
            verification_id: (verification as TaskaiWhatsappVerification).id,
            phone_number: params.phoneNumber,
            normalized_phone_number: params.normalizedPhoneNumber,
        },
        overridePhoneNumber: params.phoneNumber,
        overrideNormalizedPhoneNumber: params.normalizedPhoneNumber,
        bypassPreferenceCheck: true,
        allowPendingConnection: true,
    })

    return verification as TaskaiWhatsappVerification
}

export async function verifyWhatsappBindingFromMessage(params: {
    fromJid?: string | null
    phoneNumber?: string | null
    message?: string | null
    messageId?: string | null
}): Promise<VerificationReplyResult> {
    const message = (params.message ?? '').trim()
    if (!message) return { handled: false, verified: false }

    const normalizedPhoneNumber =
        normalizeWhatsAppNumber(params.phoneNumber) ?? extractWhatsappDigitsFromJid(params.fromJid) ?? null
    const looksLikeIntent =
        /\b(?:taskai|verify|verification|bind)\b/i.test(message) || /^\s*\d{6}\s*$/.test(message)
    const codeMatch = message.match(/\b(\d{6})\b/)
    const attemptedCode = codeMatch?.[1] ?? null

    let verification: TaskaiWhatsappVerification | null = null

    if (normalizedPhoneNumber) {
        const { data: verificationRows, error } = await supabaseAdmin
            .from('taskai_whatsapp_verifications')
            .select('*')
            .eq('channel', DEFAULT_CHANNEL)
            .eq('normalized_phone_number', normalizedPhoneNumber)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)

        if (error) throw new Error(error.message)
        verification = ((verificationRows ?? [])[0] as TaskaiWhatsappVerification | undefined) ?? null
    }

    // Some WhatsApp bridges surface replies from privacy-preserving @lid identities instead of phone-based JIDs.
    // In that case we cannot recover the sender's phone number from the incoming JID, so fall back to a code match.
    if (!verification && attemptedCode) {
        const { data: codeRows, error: codeError } = await supabaseAdmin
            .from('taskai_whatsapp_verifications')
            .select('*')
            .eq('channel', DEFAULT_CHANNEL)
            .eq('verification_code', attemptedCode)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(2)

        if (codeError) throw new Error(codeError.message)

        if ((codeRows ?? []).length === 1) {
            verification = (codeRows?.[0] as TaskaiWhatsappVerification | undefined) ?? null
        } else if ((codeRows ?? []).length > 1) {
            return {
                handled: true,
                verified: false,
                replyMessage: 'We found multiple pending TaskAI verifications with this code. Please request a new code in TaskAI settings and try again.',
            }
        }
    }

    if (!verification) {
        if (!looksLikeIntent) {
            return { handled: false, verified: false }
        }
        return {
            handled: true,
            verified: false,
            replyMessage: 'No active TaskAI verification request was found for this WhatsApp number. Please request a new code in TaskAI settings first.',
        }
    }

    const nowIso = new Date().toISOString()

    if (new Date(verification.expires_at).getTime() <= Date.now()) {
        await supabaseAdmin
            .from('taskai_whatsapp_verifications')
            .update({
                status: 'expired',
                updated_at: nowIso,
                last_attempted_at: nowIso,
                attempt_count: verification.attempt_count + 1,
            })
            .eq('id', verification.id)
            .eq('status', 'pending')

        return {
            handled: true,
            verified: false,
            replyMessage: 'That TaskAI verification code has expired. Please request a new code in TaskAI settings and try again.',
        }
    }

    if (!codeMatch) {
        if (!looksLikeIntent) {
            return { handled: false, verified: false }
        }
        return {
            handled: true,
            verified: false,
            replyMessage: 'Please reply with the 6-digit TaskAI verification code you received, for example: TASKAI 123456',
        }
    }

    if (attemptedCode !== verification.verification_code) {
        await supabaseAdmin
            .from('taskai_whatsapp_verifications')
            .update({
                last_attempted_at: nowIso,
                attempt_count: verification.attempt_count + 1,
                updated_at: nowIso,
            })
            .eq('id', verification.id)

        return {
            handled: true,
            verified: false,
            replyMessage: 'That TaskAI verification code is not correct. Please check the latest code we sent and try again.',
        }
    }

    const { error: verificationUpdateError } = await supabaseAdmin
        .from('taskai_whatsapp_verifications')
        .update({
            status: 'verified',
            verified_at: nowIso,
            verified_from_jid: params.fromJid ?? null,
            verified_message_id: params.messageId ?? null,
            last_attempted_at: nowIso,
            attempt_count: verification.attempt_count + 1,
            updated_at: nowIso,
        })
        .eq('id', verification.id)
        .eq('status', 'pending')

    if (verificationUpdateError) throw new Error(verificationUpdateError.message)

    await saveUserWhatsAppConnection({
        userId: verification.user_id,
        phoneNumber: verification.phone_number,
        normalizedPhoneNumber: verification.normalized_phone_number,
        status: 'active',
        verifiedAt: nowIso,
        lastSeenAt: nowIso,
        updatedAt: nowIso,
    })

    await supabaseAdmin
        .from('taskai_whatsapp_verifications')
        .update({
            status: 'cancelled',
            updated_at: nowIso,
        })
        .eq('user_id', verification.user_id)
        .eq('channel', DEFAULT_CHANNEL)
        .eq('status', 'pending')
        .neq('id', verification.id)

    return {
        handled: true,
        verified: true,
        verification: {
            ...verification,
            status: 'verified',
            verified_at: nowIso,
            verified_from_jid: params.fromJid ?? null,
            verified_message_id: params.messageId ?? null,
            last_attempted_at: nowIso,
            attempt_count: verification.attempt_count + 1,
            updated_at: nowIso,
        },
        replyMessage: `✅ Your TaskAI WhatsApp number is now verified. You will receive future reminders on this chat.`,
    }
}

export async function enqueueTaskNewAvailableNotifications(params: {
    orgId: string
    taskId: string
    title: string
    points: number
    origin: string
    visibleGroupIds?: string[]
}) {
    let recipientIds: string[] = []

    if (params.visibleGroupIds?.length) {
        const { data, error } = await supabaseAdmin
            .from('group_memberships')
            .select('user_id')
            .eq('org_id', params.orgId)
            .in('group_id', params.visibleGroupIds)
        if (error) throw new Error(error.message)
        recipientIds = [...new Set((data ?? []).map((row) => row.user_id as string))]
    } else {
        const { data, error } = await supabaseAdmin
            .from('organization_memberships')
            .select('user_id')
            .eq('org_id', params.orgId)
            .eq('status', 'active')
            .eq('role', 'member')
        if (error) throw new Error(error.message)
        recipientIds = [...new Set((data ?? []).map((row) => row.user_id as string))]
    }

    if (!recipientIds.length) return []

    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', params.orgId)
        .maybeSingle()
    if (orgError) throw new Error(orgError.message)

    const taskUrl = `${params.origin}/taskai/tasks/${params.taskId}`
    const jobs = []
    for (const userId of recipientIds) {
        const user = await getUserDisplayInfo(userId)
        jobs.push(
            await enqueueNotificationJob({
                orgId: params.orgId,
                userId,
                taskId: params.taskId,
                eventType: 'task_new_available',
                dedupeKey: `whatsapp:task_new_available:${params.taskId}:${userId}`,
                context: {
                    firstName: user?.name ?? user?.email ?? null,
                    taskTitle: params.title,
                    points: params.points,
                    taskUrl,
                    orgName: (org?.name as string | undefined) ?? null,
                },
                payload: {
                    task_title: params.title,
                    task_url: taskUrl,
                    points: params.points,
                },
            })
        )
    }

    return jobs
}

export async function enqueueClaimReminderNotifications(params: {
    orgId: string
    userId: string
    taskId: string
    title: string
    points: number
    origin: string
    claimedAtIso: string
}) {
    const user = await getUserDisplayInfo(params.userId)
    const workspaceUrl = `${params.origin}/taskai/workspace?taskId=${encodeURIComponent(params.taskId)}&title=${encodeURIComponent(params.title)}&points=${encodeURIComponent(String(params.points))}&orgId=${encodeURIComponent(params.orgId)}`

    const noAiAt = new Date(new Date(params.claimedAtIso).getTime() + 30 * 60 * 1000).toISOString()
    const stalledAt = new Date(new Date(params.claimedAtIso).getTime() + 48 * 60 * 60 * 1000).toISOString()

    return Promise.all([
        enqueueNotificationJob({
            orgId: params.orgId,
            userId: params.userId,
            taskId: params.taskId,
            eventType: 'task_claimed',
            dedupeKey: `whatsapp:task_claimed:${params.taskId}:${params.userId}:${params.claimedAtIso}`,
            context: {
                firstName: user?.name ?? user?.email ?? null,
                taskTitle: params.title,
                points: params.points,
                workspaceUrl,
            },
            payload: {
                task_title: params.title,
                workspace_url: workspaceUrl,
                points: params.points,
                claimed_at: params.claimedAtIso,
            },
        }),
        enqueueNotificationJob({
            orgId: params.orgId,
            userId: params.userId,
            taskId: params.taskId,
            eventType: 'task_claimed_no_ai_started',
            dedupeKey: `whatsapp:task_claimed_no_ai_started:${params.taskId}:${params.userId}:${params.claimedAtIso}`,
            scheduledFor: noAiAt,
            context: {
                firstName: user?.name ?? user?.email ?? null,
                taskTitle: params.title,
                points: params.points,
                workspaceUrl,
            },
            payload: {
                task_title: params.title,
                workspace_url: workspaceUrl,
                points: params.points,
                claimed_at: params.claimedAtIso,
            },
        }),
        enqueueNotificationJob({
            orgId: params.orgId,
            userId: params.userId,
            taskId: params.taskId,
            eventType: 'task_claimed_stalled',
            dedupeKey: `whatsapp:task_claimed_stalled:${params.taskId}:${params.userId}:${params.claimedAtIso}`,
            scheduledFor: stalledAt,
            context: {
                firstName: user?.name ?? user?.email ?? null,
                taskTitle: params.title,
                points: params.points,
                workspaceUrl,
            },
            payload: {
                task_title: params.title,
                workspace_url: workspaceUrl,
                points: params.points,
                claimed_at: params.claimedAtIso,
            },
        }),
    ])
}

export async function enqueueTaskCompletedNotification(params: {
    orgId: string
    userId: string
    taskId: string
    title: string
    points: number
    origin: string
    completionKey: string
}) {
    const user = await getUserDisplayInfo(params.userId)
    const { data: membership, error: membershipError } = await supabaseAdmin
        .from('organization_memberships')
        .select('points_earned_total')
        .eq('org_id', params.orgId)
        .eq('user_id', params.userId)
        .maybeSingle()
    if (membershipError) throw new Error(membershipError.message)

    const summaryUrl = `${params.origin}/taskai/tasks/${params.taskId}`
    return enqueueNotificationJob({
        orgId: params.orgId,
        userId: params.userId,
        taskId: params.taskId,
        eventType: 'task_completed_encourage',
        dedupeKey: `whatsapp:task_completed_encourage:${params.taskId}:${params.userId}:${params.completionKey}`,
        context: {
            firstName: user?.name ?? user?.email ?? null,
            taskTitle: params.title,
            points: params.points,
            totalPoints: Number(membership?.points_earned_total ?? 0),
            summaryUrl,
        },
        payload: {
            task_title: params.title,
            points: params.points,
            summary_url: summaryUrl,
        },
    })
}

export function requireBridgeToken(request: NextRequest) {
    const expected = process.env.TASKAI_INTERNAL_BRIDGE_TOKEN?.trim()
    if (!expected) {
        throw new Error('TASKAI_INTERNAL_BRIDGE_TOKEN is not configured')
    }

    const bearer = getBearerToken(request)
    const headerToken = request.headers.get('x-taskai-bridge-token')?.trim()
    const actual = bearer || headerToken || ''

    if (!actual || actual !== expected) {
        const error = new Error('Invalid bridge token')
        ;(error as Error & { status?: number }).status = 401
        throw error
    }
}
