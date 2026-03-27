'use client'

import { WeeklyActivityChart } from '@/components/taskai/WeeklyActivityChart'
import { RecentActivityFeed } from '@/components/taskai/RecentActivityFeed'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiActivities } from '@/hooks/taskai/useTaskaiActivities'
import { useTaskaiOverview } from '@/hooks/taskai/useTaskaiOverview'
import { useTaskaiTrend } from '@/hooks/taskai/useTaskaiTrend'
import { Activity, CheckCircle2, Coins, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'taskai_admin_org_id'

export default function AdminTaskaiInsightsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { memberships } = useTaskaiMemberships()

    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])
    const [orgId, setOrgId] = useState<string | null>(null)
    const { kpi, loading: overviewLoading } = useTaskaiOverview(orgId)
    const { rows: activities, loading: activitiesLoading } = useTaskaiActivities(orgId, 8)
    const { data: trendData, loading: trendLoading } = useTaskaiTrend(orgId, 7)
    const loading = overviewLoading || activitiesLoading || trendLoading

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, user, router])

    useEffect(() => {
        if (!ownerMemberships.length) {
            setOrgId(null)
            return
        }
        let initial: string | null = null
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored && ownerMemberships.some((m) => m.org_id === stored)) initial = stored
        } catch {
            /* */
        }
        if (!initial) initial = ownerMemberships[0].org_id
        setOrgId(initial)
    }, [ownerMemberships])

    useEffect(() => {
        const onOrgChanged = (evt: Event) => {
            const orgIdFromHeader = (evt as CustomEvent<{ orgId?: string }>).detail?.orgId
            if (orgIdFromHeader && ownerMemberships.some((m) => m.org_id === orgIdFromHeader)) {
                setOrgId(orgIdFromHeader)
            }
        }
        window.addEventListener('taskai-admin-org-changed', onOrgChanged as EventListener)
        return () => window.removeEventListener('taskai-admin-org-changed', onOrgChanged as EventListener)
    }, [ownerMemberships])

    if (authLoading || !user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">Loading...</div>
    }

    const completionRate = kpi?.totalTasks ? Math.round(((kpi?.completedTasks ?? 0) / kpi.totalTasks) * 100) : 0
    const pointsDistributed = (kpi?.myPoints ?? 0) + (kpi?.pointsPoolRemaining != null ? 0 : 0)

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Organization Insights</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Real-time analytics on task progress, team impact, and organizational health
                    </p>
                </div>
            </div>

            {!orgId ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No manageable organization yet. Create one in Task Board.
                </p>
            ) : loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
            ) : (
                <>
                    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <KpiCard icon={<Activity className="h-5 w-5 text-blue-600" />} badge="Live" value={kpi?.totalTasks ?? 0} label="Total Tasks Created" />
                        <KpiCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} badge={`${completionRate}%`} value={kpi?.completedTasks ?? 0} label="Tasks Completed" />
                        <KpiCard icon={<Coins className="h-5 w-5 text-purple-600" />} badge="Points" value={pointsDistributed} label="Points Distributed" />
                        <KpiCard icon={<Users className="h-5 w-5 text-amber-600" />} badge="Team" value={kpi?.membersCount ?? 0} label="Active Staff Now" />
                    </div>

                    <div className="mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 via-purple-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl">🤖</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold">AI-Powered Productivity Impact</h3>
                                <p className="mt-1 text-sm text-white/75">
                                    TaskAI&apos;s intelligent collaboration has accelerated your team&apos;s output this week.
                                </p>
                            </div>
                            <div className="flex gap-6">
                                <Metric value={`${completionRate}%`} label="Completion" />
                                <Metric value={`${kpi?.inProgressTasks ?? 0}`} label="In Progress" />
                                <Metric value={`${kpi?.membersCount ?? 0}`} label="Contributors" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-1 font-bold text-slate-800">Task Completion Rate</h3>
                            <p className="mb-6 text-xs text-slate-400">Overall progress across all tasks</p>
                            <div className="flex items-center gap-6">
                                <div className="relative h-28 w-28 rounded-full bg-slate-100 p-2">
                                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-extrabold text-indigo-600">
                                        {completionRate}%
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <p>Open: <span className="font-semibold text-slate-800">{kpi?.openTasks ?? 0}</span></p>
                                    <p>In Progress: <span className="font-semibold text-slate-800">{kpi?.inProgressTasks ?? 0}</span></p>
                                    <p>Completed: <span className="font-semibold text-slate-800">{kpi?.completedTasks ?? 0}</span></p>
                                </div>
                            </div>
                        </div>
                        <WeeklyActivityChart data={trendData} loading={trendLoading} />
                    </div>

                    <div className="mt-6">
                        <RecentActivityFeed rows={activities} />
                    </div>
                </>
            )}
        </div>
    )
}

function KpiCard({
    icon,
    badge,
    value,
    label,
}: {
    icon: ReactNode
    badge: string
    value: number
    label: string
}) {
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

function Metric({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <p className="text-3xl font-extrabold">{value}</p>
            <p className="mt-0.5 text-xs text-white/60">{label}</p>
        </div>
    )
}
