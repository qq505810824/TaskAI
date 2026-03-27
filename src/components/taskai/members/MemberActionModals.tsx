type MemberRow = {
    id: string
    user: { name: string | null; email: string | null }
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
