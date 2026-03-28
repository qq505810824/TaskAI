'use client'

import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type CopyToClipboardButtonProps = {
    /** Plain text written to the clipboard */
    text: string
    disabled?: boolean
    className?: string
    title?: string
    /** Shown for 1.5s after a successful copy (override with successDurationMs) */
    successDurationMs?: number
    onCopySuccess?: () => void
    onCopyError?: (err: unknown) => void
}

const defaultButtonClass =
    'inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50'

export function CopyToClipboardButton({
    text,
    disabled = false,
    className,
    title = 'Copy',
    successDurationMs = 1500,
    onCopySuccess,
    onCopyError,
}: CopyToClipboardButtonProps) {
    const [copied, setCopied] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    const handleClick = async () => {
        if (!text.trim() || disabled) return
        try {
            await navigator.clipboard.writeText(text)
            if (timerRef.current) clearTimeout(timerRef.current)
            setCopied(true)
            onCopySuccess?.()
            timerRef.current = setTimeout(() => {
                setCopied(false)
                timerRef.current = null
            }, successDurationMs)
        } catch (err) {
            if (onCopyError) onCopyError(err)
            else console.error('Failed to copy:', err)
        }
    }

    const isDisabled = disabled || !text.trim()

    return (
        <button
            type="button"
            onClick={() => void handleClick()}
            disabled={isDisabled}
            title={title}
            aria-label={title}
            className={cn(defaultButtonClass, className)}
        >
            {copied ? (
                <Check className="h-4 w-4 text-green-500" aria-hidden />
            ) : (
                <Copy className="h-4 w-4" aria-hidden />
            )}
        </button>
    )
}
