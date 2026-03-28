import { requireAuthUser } from '@/lib/taskai/api-auth'
import { enqueueNotificationJob, getUserDisplayInfo } from '@/lib/taskai/notifications'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const auth = await requireAuthUser(request)
    if (!auth.ok) return auth.response

    try {
        const requestedOrgId = request.nextUrl.searchParams.get('orgId')?.trim() || null
        let fallbackOrgId: string | null = requestedOrgId

        if (!fallbackOrgId) {
            const { data: firstMembership, error: membershipError } = await supabaseAdmin
                .from('organization_memberships')
                .select('org_id')
                .eq('user_id', auth.userId)
                .eq('status', 'active')
                .order('joined_at', { ascending: true })
                .limit(1)
                .maybeSingle()
            if (membershipError) throw membershipError
            fallbackOrgId = firstMembership?.org_id ?? null
        }

        const user = await getUserDisplayInfo(auth.userId)
        const result = await enqueueNotificationJob({
            orgId: fallbackOrgId,
            userId: auth.userId,
            eventType: 'test_message',
            dedupeKey: `whatsapp:test_message:${auth.userId}:${Date.now()}`,
            context: {
                firstName: user?.name ?? user?.email ?? null,
            },
            payload: {
                kind: 'manual_test',
            },
        })

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.reason,
                    message:
                        result.reason === 'no_active_whatsapp_connection'
                            ? 'Please save an active WhatsApp number first'
                            : 'Notification preference currently prevents sending this test message',
                },
                { status: 400 }
            )
        }

        return NextResponse.json({ success: true, data: { job: result.job } })
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_enqueue_test_whatsapp_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
