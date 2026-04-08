import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

type MailPayload = {
    to: string
    subject: string
    html: string
    text: string
}

let transporter: nodemailer.Transporter | null = null

function getRequiredEnv(name: string) {
    const value = process.env[name]?.trim()
    if (!value) {
        throw new Error(`Missing mail configuration: ${name}`)
    }
    return value
}

function getTransporter() {
    if (transporter) {
        return transporter
    }

    const host = getRequiredEnv('SMTP_ADDRESS')
    const port = Number(getRequiredEnv('SMTP_PORT'))
    const user = getRequiredEnv('SMTP_USERNAME')
    const pass = getRequiredEnv('SMTP_PASSWORD')
    const startTls = (process.env.SMTP_ENABLE_STARTTLS_AUTO ?? 'true').toLowerCase() === 'true'
    const secure = port === 465

    const transportOptions: SMTPTransport.Options = {
        host,
        port,
        secure,
        authMethod: process.env.SMTP_AUTHENTICATION?.trim() || undefined,
        auth: {
            user,
            pass,
        },
        // Gmail SMTP with port 465 uses implicit TLS, so STARTTLS is only required for non-secure ports like 587.
        requireTLS: !secure && startTls,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
            servername: host,
        },
    }

    transporter = nodemailer.createTransport(transportOptions)

    return transporter
}

export function hasMailerConfig() {
    return Boolean(
        process.env.SMTP_ADDRESS &&
            process.env.SMTP_PORT &&
            process.env.SMTP_USERNAME &&
            process.env.SMTP_PASSWORD &&
            process.env.MAILER_FROM
    )
}

export async function sendMail(payload: MailPayload) {
    const from = getRequiredEnv('MAILER_FROM')
    await getTransporter().sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
    })
}
