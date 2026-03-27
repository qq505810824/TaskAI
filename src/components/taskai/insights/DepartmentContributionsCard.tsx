import type { TaskaiDepartmentContribution } from '@/hooks/taskai/useTaskaiOverview'

const BAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500']

export function DepartmentContributionsCard({ rows }: { rows: TaskaiDepartmentContribution[] }) {


    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 font-bold text-slate-800">Department Contributions</h3>
            <p className="mb-5 text-xs text-slate-400">Points earned by category</p>

            {!rows.length ? (
                <p className="text-sm text-slate-500">No category stats yet.</p>
            ) : (
                <div className="space-y-3">
                    {rows.map((dept, i) => {
                        const pct = Math.round((dept.completed / dept.tasks) * 100)
                        const color = BAR_COLORS[i % BAR_COLORS.length]
                        return (
                            <div key={dept.category}>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
                                        <span className="text-sm font-medium text-slate-700">{dept.category}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-800">{dept.points} pts</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-20 text-right text-xs text-slate-400">
                                        {dept.completed}/{dept.tasks} tasks
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
