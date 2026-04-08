import { buildRecoveryEmail } from '@/lib/auth-email'
import { sendMail } from '@/lib/mailer'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

function getRecoveryRedirectUrl(origin: string) {
    const redirectUrl = new URL('/reset-password', origin)
    return redirectUrl.toString()
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            email?: string
        }

        const email = body.email?.trim().toLowerCase()
        if (!email) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Email is required.',
                },
                { status: 400 }
            )
        }

        const redirectTo = getRecoveryRedirectUrl(request.nextUrl.origin)
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo,
            },
        })

        if (!error && data.properties?.action_link) {
            const emailPayload = buildRecoveryEmail({
                actionLink: data.properties.action_link,
                email,
            })

            await sendMail({
                to: email,
                subject: emailPayload.subject,
                html: emailPayload.html,
                text: emailPayload.text,
            })
        } else if (error && !/user/i.test(error.message)) {
            return NextResponse.json(
                {
                    success: false,
                    message: error.message || 'Failed to prepare the reset email.',
                },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'If this email is registered, we will send a password reset link shortly.',
        })
    } catch (error) {
        console.error('Error in POST /api/auth/forgot-password:', error)
        const message =
            error instanceof Error && /(ESOCKET|ETIMEDOUT|EHOSTUNREACH|ECONNREFUSED|Connection timeout|Missing mail configuration)/i.test(error.message)
                ? 'We could not send the reset email right now. Please try again in a few minutes.'
                : error instanceof Error
                  ? error.message
                  : 'Failed to send reset email.'

        return NextResponse.json(
            {
                success: false,
                message,
            },
            { status: 500 }
        )
    }
}
