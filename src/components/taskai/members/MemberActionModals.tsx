import { AlertCircle, Info } from 'lucide-react'

type MemberRow = {
    id: string
    user: { name: string | null; email: string | null }
}

/** 单按钮提示（替代 alert） */
export function MemberNoticeModal({
    open,
    title,
    message,
    variant = 'error',
    onClose,
}: {
    open: boolean
    title: string
    message: string
    variant?: 'error' | 'info'
    onClose: () => void
}) {
    if (!open) return null
    const isError = variant === 'error'
    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isError ? 'bg-rose-100' : 'bg-indigo-100'
                        }`}
                    >
                        {isError ? (
                            <AlertCircle className="h-5 w-5 text-rose-600" aria-hidden />
                        ) : (
                            <Info className="h-5 w-5 text-indigo-600" aria-hidden />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className={`text-lg font-bold ${isError ? 'text-rose-900' : 'text-slate-800'}`}>{title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                            isError ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}

export function RemoveMemberModal({
    target,
    removing,
    onClose,
    onConfirm,
}: {
    target: MemberRow | null
    removing: boolean
    onClose: () => void
    onConfirm: () => void
}) {
    if (!target) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-800">Confirm removal</h3>
                <p className="mt-2 text-sm text-slate-500">
                    Remove <span className="font-semibold text-slate-700">{target.user?.name || target.user?.email}</span> from this organization?
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={removing}
                        onClick={onConfirm}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                        {removing ? 'Removing...' : 'Confirm Remove'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function RegenerateInviteModal({
    open,
    creating,
    onClose,
    onConfirm,
}: {
    open: boolean
    creating: boolean
    onClose: () => void
    onConfirm: () => void
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-800">Regenerate invite code?</h3>
                <p className="mt-2 text-sm text-slate-500">
                    This will invalidate the current code immediately. Existing shared code will stop working.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={creating}
                        onClick={onConfirm}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {creating ? 'Generating...' : 'Confirm Regenerate'}
                    </button>
                </div>
            </div>
        </div>
    )
}
