import { ChartPie, Clock3, DollarSign, HandHeart, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

const MOCK = {
    velocityIncrease: '3.2x',
    quarterlySavings: '$18.4k',
    engagementScore: '91%',
    performanceGrowth: 'Up 26% since adopting TaskAI',
}

export function QuarterlyRoiSummaryCard({ completionRate }: { completionRate: number }) {
    return (
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-800 to-slate-900 p-6 text-white shadow-sm lg:p-8">
            <div className="absolute -right-48 -top-48 h-96 w-96 rounded-full bg-indigo-500/5" />
            <div className="absolute -left-32 bottom-0 h-64 w-64 translate-y-32 rounded-full bg-purple-500/5" />

            <div className="relative">
                <div className="mb-8 flex items-start gap-3">
                    <ChartPie className="mt-0.5 h-5 w-5 text-indigo-400" />
                    <div>
                        <h3 className="text-xl font-bold">Quarterly ROI Summary</h3>
                        <p className="text-sm text-white/50">
                            How TaskAI is transforming your organization&apos;s productivity and bottom line
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
                    <Metric icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} value={`${completionRate}%`} label="Task Completion" />
                    <Metric icon={<Clock3 className="h-4 w-4 text-blue-400" />} value={MOCK.velocityIncrease} label="Velocity Increase" />
                    <Metric icon={<DollarSign className="h-4 w-4 text-amber-400" />} value={MOCK.quarterlySavings} label="Quarterly Savings" />
                    <Metric icon={<HandHeart className="h-4 w-4 text-purple-400" />} value={MOCK.engagementScore} label="Engagement Score" />
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
                    <p className="text-sm font-semibold text-emerald-400">{MOCK.performanceGrowth}</p>
                    <span className="text-xs text-white/30 sm:ml-auto">Last updated: Today</span>
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
