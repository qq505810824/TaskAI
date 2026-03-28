import { requireBridgeToken } from '@/lib/taskai/notifications'
import { verifyWhatsappBindingFromMessage } from '@/lib/taskai/notifications'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        requireBridgeToken(request)

        const body = (await request.json().catch(() => ({}))) as {
            fromJid?: string | null
            phoneNumber?: string | null
            message?: string | null
            messageId?: string | null
        }

        const result = await verifyWhatsappBindingFromMessage({
            fromJid: body.fromJid ?? null,
            phoneNumber: body.phoneNumber ?? null,
            message: body.message ?? null,
            messageId: body.messageId ?? null,
        })

        return NextResponse.json({ success: true, data: result })
    } catch (e) {
        const status = typeof (e as { status?: number })?.status === 'number' ? (e as { status: number }).status : 500
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_verify_whatsapp_binding_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status }
        )
    }
}
