import { Copy, Plus, Sparkles } from 'lucide-react'

export function InviteCodeCard({
    code,
    creating,
    copyHint,
    onCopy,
    onRegenerate,
}: {
    code: string | null | undefined
    creating: boolean
    copyHint: string | null
    onCopy: () => void
    onRegenerate: () => void
}) {
    return (
        <section className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h3 className="font-semibold">Invite Code</h3>
            </div>
            <p className="text-sm text-slate-500">Only one active 9-digit code. Regenerate to replace old code.</p>
            <div className="mt-4 flex items-center gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-lg tracking-widest text-slate-700">
                    {code ? code.replace(/(\d{3})(?=\d)/g, '$1 ') : '--- --- ---'}
                </div>
                <button
                    type="button"
                    onClick={onCopy}
                    disabled={!code}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                    <Copy className="h-4 w-4" />
                </button>
            </div>
            <button
                type="button"
                disabled={creating}
                onClick={onRegenerate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
            >
                <Plus className="h-4 w-4" />
                {creating ? 'Generating...' : code ? 'Regenerate Code' : 'Generate Code'}
            </button>
            {copyHint ? <p className="mt-2 text-sm text-emerald-600">{copyHint}</p> : null}
        </section>
    )
}
