import { buildVerificationEmail } from '@/lib/auth-email'
import { sendMail } from '@/lib/mailer'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

function getVerificationRedirectUrl(origin: string) {
    const redirectUrl = new URL('/auth/callback', origin)
    redirectUrl.searchParams.set('flow', 'email-verification')
    return redirectUrl.toString()
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            username?: string
            email?: string
            password?: string
        }

        const username = body.username?.trim()
        const email = body.email?.trim().toLowerCase()
        const password = body.password ?? ''

        if (!username || !email || password.length < 6) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Username, email, and a password with at least 6 characters are required.',
                },
                { status: 400 }
            )
        }

        const redirectTo = getVerificationRedirectUrl(request.nextUrl.origin)
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            password,
            options: {
                redirectTo,
                data: {
                    username,
                },
            },
        })

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: error.message || 'Failed to create the verification email.',
                },
                { status: 400 }
            )
        }

        const actionLink = data.properties?.action_link
        if (!actionLink) {
            throw new Error('Supabase did not return a verification link')
        }

        try {
            const emailPayload = buildVerificationEmail({
                actionLink,
                email,
            })

            await sendMail({
                to: email,
                subject: emailPayload.subject,
                html: emailPayload.html,
                text: emailPayload.text,
            })
        } catch (mailError) {
            if (data.user?.id) {
                await supabaseAdmin.auth.admin.deleteUser(data.user.id)
            }
            throw mailError
        }

        return NextResponse.json({
            success: true,
            message: 'Verification email sent successfully.',
        })
    } catch (error) {
        console.error('Error in POST /api/auth/register:', error)
        const message =
            error instanceof Error && /(ESOCKET|ETIMEDOUT|EHOSTUNREACH|ECONNREFUSED|Connection timeout|Missing mail configuration)/i.test(error.message)
                ? 'Unable to send the verification email right now. Please check the SMTP settings or network connection and try again.'
                : error instanceof Error
                  ? error.message
                  : 'Failed to register account.'

        return NextResponse.json(
            {
                success: false,
                message,
            },
            { status: 500 }
        )
    }
}
