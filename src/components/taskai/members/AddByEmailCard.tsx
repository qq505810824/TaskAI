import { Mail, Users } from 'lucide-react'

export function AddByEmailCard({
    email,
    adding,
    disabled,
    onEmailChange,
    onAdd,
}: {
    email: string
    adding: boolean
    disabled: boolean
    onEmailChange: (value: string) => void
    onAdd: () => void
}) {
    return (
        <section className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
                <Mail className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold">Add by Email</h3>
            </div>
            <p className="text-sm text-slate-500">Add existing registered users directly into this organization.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                    type="email"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                />
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onAdd}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                    <Users className="h-4 w-4" />
                    {adding ? 'Adding...' : 'Add Member'}
                </button>
            </div>
        </section>
    )
}
