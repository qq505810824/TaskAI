import { ChartPie, Clock3, DollarSign, HandHeart, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

export function QuarterlyRoiSummaryCard({
    completionRate,
    totalTasks,
    completedTasks,
    inProgressTasks,
    membersCount,
    pointsDistributed,
}: {
    completionRate: number
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    membersCount: number
    pointsDistributed: number
}) {
    const avgPointsPerMember = membersCount > 0 ? Math.round(pointsDistributed / membersCount) : 0
    const activeTasks = inProgressTasks
    const remainingTasks = Math.max(totalTasks - completedTasks, 0)

    return (
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-800 to-slate-900 p-6 text-white shadow-sm lg:p-8">
            <div className="absolute -right-48 -top-48 h-96 w-96 rounded-full bg-indigo-500/5" />
            <div className="absolute -left-32 bottom-0 h-64 w-64 translate-y-32 rounded-full bg-purple-500/5" />

            <div className="relative">
                <div className="mb-8 flex items-start gap-3">
                    <ChartPie className="mt-0.5 h-5 w-5 text-indigo-400" />
                    <div>
                        <h3 className="text-xl font-bold">Live Performance Summary</h3>
                        <p className="text-sm text-white/50">
                            A live snapshot based on your current organization data
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
                    <Metric icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} value={`${completionRate}%`} label="Task Completion" />
                    <Metric icon={<Clock3 className="h-4 w-4 text-blue-400" />} value={`${activeTasks}`} label="Active Tasks" />
                    <Metric icon={<DollarSign className="h-4 w-4 text-amber-400" />} value={`${pointsDistributed}`} label="Points Distributed" />
                    <Metric icon={<HandHeart className="h-4 w-4 text-purple-400" />} value={`${avgPointsPerMember}`} label="Avg Points / Member" />
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
                    <p className="text-sm font-semibold text-emerald-400">
                        {completedTasks} completed, {remainingTasks} remaining across {totalTasks} tasks.
                    </p>
                    <span className="text-xs text-white/30 sm:ml-auto">Live organization snapshot</span>
                </div>
            </div>
        </section>
    )
}

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">{icon}</div>
            <p className="text-2xl font-extrabold lg:text-3xl">{value}</p>
            <p className="mt-1 text-xs text-white/40">{label}</p>
        </div>
    )
}
