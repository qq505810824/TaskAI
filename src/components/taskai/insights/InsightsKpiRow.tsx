import { Activity, CheckCircle2, Coins, Users } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
    totalTasks: number
    completedTasks: number
    membersCount: number
    pointsDistributed: number
    completionRate: number
}

export function InsightsKpiRow({
    totalTasks,
    completedTasks,
    membersCount,
    pointsDistributed,
    completionRate,
}: Props) {
    return (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={<Activity className="h-5 w-5 text-blue-600" />} badge="Live" value={totalTasks} label="Total Tasks Created" />
            <KpiCard
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                badge={`${completionRate}%`}
                value={completedTasks}
                label="Tasks Completed"
            />
            <KpiCard icon={<Coins className="h-5 w-5 text-purple-600" />} badge="Points" value={pointsDistributed} label="Points Distributed" />
            <KpiCard icon={<Users className="h-5 w-5 text-amber-600" />} badge="Team" value={membersCount} label="Active Staff Now" />
        </div>
    )
}

function KpiCard({ icon, badge, value, label }: { icon: ReactNode; badge: string; value: number; label: string }) {
    return (
        <div className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">{icon}</div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">{badge}</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
        </div>
    )
}
