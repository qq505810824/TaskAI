function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

type LinkEmailArgs = {
    actionLink: string
    productName?: string
    email: string
}

export function buildVerificationEmail({ actionLink, productName = 'TaskAI', email }: LinkEmailArgs) {
    const safeEmail = escapeHtml(email)
    const safeLink = escapeHtml(actionLink)
    const subject = `${productName} email verification`
    const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Verify your email</h1>
            <p style="font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
                Hello${safeEmail ? ` ${safeEmail}` : ''}, thanks for creating your ${escapeHtml(productName)} account.
            </p>
            <p style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
                Please confirm your email address before you log in.
            </p>
            <p style="margin-bottom: 24px;">
                <a href="${safeLink}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 600;">
                    Verify email
                </a>
            </p>
            <p style="font-size: 13px; line-height: 1.7; color: #64748b;">
                If the button does not work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 13px; line-height: 1.7; word-break: break-all; color: #334155;">${safeLink}</p>
        </div>
    `
    const text = `Verify your ${productName} email by opening this link:\n\n${actionLink}`

    return { subject, html, text }
}

export function buildRecoveryEmail({ actionLink, productName = 'TaskAI', email }: LinkEmailArgs) {
    const safeEmail = escapeHtml(email)
    const safeLink = escapeHtml(actionLink)
    const subject = `${productName} password reset`
    const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your password</h1>
            <p style="font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
                We received a request to reset the password for ${safeEmail}.
            </p>
            <p style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
                Use the button below to set a new password.
            </p>
            <p style="margin-bottom: 24px;">
                <a href="${safeLink}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 600;">
                    Reset password
                </a>
            </p>
            <p style="font-size: 13px; line-height: 1.7; color: #64748b;">
                If the button does not work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 13px; line-height: 1.7; word-break: break-all; color: #334155;">${safeLink}</p>
        </div>
    `
    const text = `Reset your ${productName} password by opening this link:\n\n${actionLink}`

    return { subject, html, text }
}
