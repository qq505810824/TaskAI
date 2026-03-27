type Props = {
    completionRate: number
    completed: number
    inProgress: number
    open: number
    avgPointsPerMember: number
}

export function TaskCompletionRateCard({
    completionRate,
    completed,
    inProgress,
    open,
    avgPointsPerMember,
}: Props) {
    const circumference = 352
    const progressOffset = circumference - (circumference * completionRate) / 100

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 font-bold text-slate-800">Task Completion Rate</h3>
            <p className="mb-6 text-xs text-slate-400">Overall progress across all tasks</p>
            <div className="flex items-center gap-8">
                <div className="relative shrink-0">
                    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
                        <circle cx="70" cy="70" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                        <circle
                            cx="70"
                            cy="70"
                            r="56"
                            fill="none"
                            stroke="url(#taskai-completion-grad)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={progressOffset}
                            transform="rotate(-90 70 70)"
                            className="transition-all duration-700 ease-out"
                        />
                        <defs>
                            <linearGradient id="taskai-completion-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-slate-800">{completionRate}%</span>
                        <span className="text-xs text-slate-400">complete</span>
                    </div>
                </div>

                <div className="flex-1 space-y-3">
                    <Row label="Completed" dotClass="bg-emerald-500" value={completed} />
                    <Row label="In Progress" dotClass="bg-amber-500" value={inProgress} />
                    <Row label="Open" dotClass="bg-blue-500" value={open} />
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-sm font-medium text-slate-600">Avg Points / Member</span>
                        <span className="font-bold text-indigo-600">{avgPointsPerMember}</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

function Row({ label, dotClass, value }: { label: string; dotClass: string; value: number }) {
    return (
        <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-slate-600">
                <span className={`inline-block h-3 w-3 rounded-full ${dotClass}`} />
                {label}
            </span>
            <span className="font-bold text-slate-800">{value}</span>
        </div>
    )
}
