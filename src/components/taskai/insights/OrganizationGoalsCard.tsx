import { BriefcaseBusiness, Lightbulb, ShieldCheck, TrendingUp } from 'lucide-react'
import type { TaskaiDepartmentContribution } from '@/hooks/taskai/useTaskaiOverview'

type Goal = {
    name: string
    description: string
    completedTasks: number
    totalTasks: number
    earnedPoints: number
    targetPoints: number
    tone: 'indigo' | 'emerald' | 'rose' | 'amber'
}

const TONE_CLASS = {
    indigo: { bar: 'bg-indigo-500', soft: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    emerald: { bar: 'bg-emerald-500', soft: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    rose: { bar: 'bg-rose-500', soft: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    amber: { bar: 'bg-amber-500', soft: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
} as const

const ICONS = [TrendingUp, Lightbulb, ShieldCheck, BriefcaseBusiness] as const

function buildLiveGoals(rows: TaskaiDepartmentContribution[]): Goal[] {
    const tones: Goal['tone'][] = ['indigo', 'emerald', 'rose', 'amber']

    return rows.slice(0, 4).map((row, index) => {
        const targetPoints = Math.max(row.points, row.tasks * 100)
        return {
            name: row.category || 'General',
            description: `Live progress based on completed tasks and points earned in ${row.category || 'General'}.`,
            completedTasks: row.completed,
            totalTasks: row.tasks,
            earnedPoints: row.points,
            targetPoints,
            tone: tones[index % tones.length],
        }
    })
}

export function OrganizationGoalsCard({ rows }: { rows: TaskaiDepartmentContribution[] }) {
    const goals = buildLiveGoals(rows)
    const totalEarned = goals.reduce((sum, g) => sum + g.earnedPoints, 0)
    const totalTarget = goals.reduce((sum, g) => sum + g.targetPoints, 0)
    const overallPercent = totalTarget > 0 ? Math.round((totalEarned / totalTarget) * 100) : 0

    return (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800">Category Progress</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Live breakdown of progress by task category</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2">
                    <span className="text-sm font-bold text-indigo-700">{overallPercent}%</span>
                    <span className="text-xs text-indigo-500">Overall Progress</span>
                </div>
            </div>

            {!goals.length ? (
                <p className="text-sm text-slate-500">No live category progress data yet.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {goals.map((g, i) => {
                    const tone = TONE_CLASS[g.tone]
                    const Icon = ICONS[i % ICONS.length]
                    const pct = g.targetPoints > 0 ? Math.round((g.earnedPoints / g.targetPoints) * 100) : 0
                    const taskPct = g.totalTasks > 0 ? Math.round((g.completedTasks / g.totalTasks) * 100) : 0
                    return (
                        <article
                            key={g.name}
                            className={`rounded-xl border p-4 transition hover:shadow-md ${tone.border}`}
                        >
                            <div className="mb-3 flex items-start gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.soft}`}>
                                    <Icon className={`h-4 w-4 ${tone.text}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-slate-800">{g.name}</h4>
                                    <p className="mt-0.5 text-xs text-slate-400">{g.description}</p>
                                </div>
                                <span className={`text-sm font-extrabold ${tone.text}`}>{pct}%</span>
                            </div>

                            <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${tone.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>
                                    {g.completedTasks}/{g.totalTasks} tasks ({taskPct}%)
                                </span>
                                <span>
                                    {g.earnedPoints}/{g.targetPoints} pts
                                </span>
                            </div>
                        </article>
                    )
                    })}
                </div>
            )}
        </section>
    )
}
