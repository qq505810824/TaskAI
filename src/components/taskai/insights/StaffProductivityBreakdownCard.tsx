import type { TaskaiStaffProductivity } from '@/hooks/taskai/useTaskaiOverview'
import { Check, LoaderCircle } from 'lucide-react'

function initials(name: string) {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function StaffProductivityBreakdownCard({ rows }: { rows: TaskaiStaffProductivity[] }) {
    const maxPoints = Math.max(1, ...rows.map((r) => r.pointsEarnedTotal))

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 font-bold text-slate-800">Staff Productivity Breakdown</h3>
            <p className="mb-5 text-xs text-slate-400">Individual contribution analysis</p>

            {!rows.length ? (
                <p className="text-sm text-slate-500">No staff productivity data yet.</p>
            ) : (
                <div className="space-y-4">
                    {rows.slice(0, 8).map((s) => {
                        const pct = Math.round((s.tasksCompleted / s.totalAssigned) * 100)
                        return (
                            <div key={s.userId} className="flex items-center gap-3">
                                {s.avatarUrl ? (
                                    <img
                                        src={s.avatarUrl}
                                        alt={s.name}
                                        className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">
                                        {initials(s.name)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="truncate text-sm font-semibold text-slate-700">{s.name}</span>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="inline-flex items-center">
                                                <Check className="mr-1 h-3 w-3 text-emerald-500" />
                                                {s.tasksCompleted} done
                                            </span>
                                            <span className="inline-flex items-center">
                                                <LoaderCircle className="mr-1 h-3 w-3 text-amber-500" />
                                                {s.tasksInProgress} active
                                            </span>
                                            <span className="font-bold text-indigo-600">{s.pointsEarnedTotal} pts</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
