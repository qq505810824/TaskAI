import { CheckCircle2, LoaderCircle, Star, Trash2 } from 'lucide-react'

type MemberRow = {
    id: string
    user_id: string
    role: string
    status: string
    joined_at: string
    points_balance: number
    points_earned_total: number
    user: { id: string; name: string | null; email: string | null; avatar_url?: string | null }
}

const emojiAvatars = ['👨‍💻', '👩‍🔬', '👨‍🎨', '👩‍💼', '👨‍🚀', '🧑‍🏫', '👩‍🚒', '🧑‍💻']
const colorSwatches = [
    'bg-linear-to-br from-indigo-100 to-blue-100',
    'bg-linear-to-br from-emerald-100 to-teal-100',
    'bg-linear-to-br from-amber-100 to-orange-100',
    'bg-linear-to-br from-purple-100 to-pink-100',
]

function pickEmoji(seed: string) {
    const code = seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    return emojiAvatars[code % emojiAvatars.length]
}

export function TeamMemberCard({
    row,
    index,
    onRemove,
}: {
    row: MemberRow
    index: number
    onRemove: (row: MemberRow) => void
}) {
    const hasActiveTask = row.points_balance > 0
    const displayName = row.user?.name || row.user?.email || 'Anonymous'
    const avatarEmoji = pickEmoji(row.user_id || row.id)

    return (
        <article
            className="card-hover taskai-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1"
            style={{ animationDelay: `${index * 0.08}s` }}
        >
            <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {row.user?.avatar_url ? (
                        <img
                            src={row.user.avatar_url}
                            alt={displayName}
                            className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 object-cover shadow-sm"
                        />
                    ) : (
                        <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ${colorSwatches[index % colorSwatches.length]}`}
                        >
                            {avatarEmoji}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h4 className="truncate font-bold text-slate-800">{displayName}</h4>
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Star className="h-3 w-3 shrink-0 text-amber-400" />
                            {row.points_earned_total} points
                        </p>
                    </div>
                </div>
                {row.role !== 'owner' ? (
                    <button
                        type="button"
                        onClick={() => onRemove(row)}
                        title="Remove member"
                        aria-label="Remove member"
                        className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                    >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                ) : null}
            </div>

            <div
                className={`rounded-xl border p-3 ${hasActiveTask ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
            >
                {hasActiveTask ? (
                    <>
                        <div className="mb-1 flex items-center gap-2 text-amber-700">
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Working On</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">Working on tasks</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {row.points_balance} pts balance · {row.role}
                        </p>
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium">Available</span>
                    </div>
                )}
            </div>
        </article>
    )
}
