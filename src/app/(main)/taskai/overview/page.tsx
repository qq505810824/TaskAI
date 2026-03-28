'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiActivities } from '@/hooks/taskai/useTaskaiActivities'
import { useTaskaiLeaderboard } from '@/hooks/taskai/useTaskaiLeaderboard'
import { useTaskaiOverview } from '@/hooks/taskai/useTaskaiOverview'
import { useTaskaiSelectedOrg } from '@/hooks/taskai/useTaskaiSelectedOrg'
import { useTaskaiTrend } from '@/hooks/taskai/useTaskaiTrend'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { WeeklyActivityChart } from '@/components/taskai/WeeklyActivityChart'
import { RecentActivityFeed } from '@/components/taskai/RecentActivityFeed'
import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'

export default function MemberTaskaiOverviewPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { memberships, loading: membershipsLoading } = useTaskaiMemberships()

    const memberMemberships = useMemo(() => memberships.filter((m) => m.role === 'member'), [memberships])
    const { orgId } = useTaskaiSelectedOrg(memberMemberships, 'member')
    const { kpi, loading: overviewLoading } = useTaskaiOverview(orgId)
    const { rows: leaderboard, loading: leaderboardLoading } = useTaskaiLeaderboard(orgId)
    const { rows: activities, loading: activitiesLoading } = useTaskaiActivities(orgId, 8)
    const { data: trendData, loading: trendLoading } = useTaskaiTrend(orgId, 7)
    const loading = overviewLoading || leaderboardLoading || activitiesLoading || trendLoading

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, user, router])

    if (authLoading || membershipsLoading || (memberMemberships.length > 0 && !orgId)) {
        return (
            <TaskaiPageLoader
                title="Loading Overview..."
                description="Waiting for your organization and analytics before rendering the overview."
            />
        )
    }

    if (!user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">加载中…</div>
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">我的总览</h1>
                    <p className="text-sm text-slate-500">个人排行、任务进度与近期活动</p>
                </div>
            </div>

            {!orgId ? (
                <p className="text-sm text-amber-700">请先通过邀请链接加入组织。</p>
            ) : loading ? (
                <p className="text-sm text-slate-500">加载中…</p>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card label="我的积分" value={kpi?.myPoints ?? 0} />
                        <Card label="我的排名" value={kpi?.myRank ?? 0} />
                        <Card label="进行中任务" value={kpi?.myInProgressTasks ?? 0} />
                        <Card label="完成任务" value={kpi?.myCompletedTasks ?? 0} />
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        <section className="lg:col-span-2">
                            <WeeklyActivityChart data={trendData} loading={trendLoading} />
                        </section>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800">排行榜</h2>
                            <ul className="mt-4 space-y-3">
                                {leaderboard.slice(0, 8).map((row) => (
                                    <li key={row.user_id} className="flex items-center justify-between text-sm">
                                        <div className={row.is_me ? 'font-semibold text-indigo-700' : 'text-slate-700'}>
                                            #{row.rank} {row.user?.name || row.user?.email || '匿名用户'}
                                        </div>
                                        <div className="font-semibold text-indigo-700">{row.points_earned_total} pts</div>
                                    </li>
                                ))}
                                {!leaderboard.length ? <li className="text-slate-400">暂无数据</li> : null}
                            </ul>
                        </section>

                        <section>
                            <RecentActivityFeed
                                rows={activities}
                                title="近期活动"
                                subtitle="组织内最新任务动态"
                                emptyText="暂无活动"
                                compact
                            />
                        </section>
                    </div>
                </>
            )}
        </div>
    )
}

function Card({ label, value }: { label: string; value: number | null }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{value ?? 0}</p>
        </div>
    )
}
