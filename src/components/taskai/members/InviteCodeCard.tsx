import { CopyToClipboardButton } from '@/components/ui/CopyToClipboardButton'
import { Sparkles } from 'lucide-react'

export function InviteCodeCard({
    code,
    onCopySuccess,
    onCopyError,
}: {
    code: string | null | undefined
    onCopySuccess?: () => void
    onCopyError?: (err: unknown) => void
}) {
    const raw = code?.trim() ?? ''

    return (
        <section className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h3 className="font-semibold">Invite Code</h3>
            </div>
            <p className="text-sm text-slate-500">
                A 9-digit code is created automatically when you create this team. Share it so members can join from the home page.
            </p>
            <div className="mt-4 flex items-center gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-lg tracking-widest text-slate-700">
                    {code ? code.replace(/(\d{3})(?=\d)/g, '$1 ') : '--- --- ---'}
                </div>
                <CopyToClipboardButton
                    text={raw}
                    disabled={!raw}
                    title="Copy invite code"
                    onCopySuccess={onCopySuccess}
                    onCopyError={onCopyError}
                />
            </div>
        </section>
    )
}
