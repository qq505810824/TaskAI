'use client'

import { AiImpactBanner } from '@/components/taskai/insights/AiImpactBanner'
import { DepartmentContributionsCard } from '@/components/taskai/insights/DepartmentContributionsCard'
import { InsightsKpiRow } from '@/components/taskai/insights/InsightsKpiRow'
import { OrganizationGoalsCard } from '@/components/taskai/insights/OrganizationGoalsCard'
import { QuarterlyRoiSummaryCard } from '@/components/taskai/insights/QuarterlyRoiSummaryCard'
import { StaffProductivityBreakdownCard } from '@/components/taskai/insights/StaffProductivityBreakdownCard'
import { TaskCompletionRateCard } from '@/components/taskai/insights/TaskCompletionRateCard'
import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'
import { WeeklyActivityChart } from '@/components/taskai/WeeklyActivityChart'
import { RecentActivityFeed } from '@/components/taskai/RecentActivityFeed'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiActivities } from '@/hooks/taskai/useTaskaiActivities'
import { useTaskaiOverview } from '@/hooks/taskai/useTaskaiOverview'
import { useTaskaiSelectedOrg } from '@/hooks/taskai/useTaskaiSelectedOrg'
import { useTaskaiTrend } from '@/hooks/taskai/useTaskaiTrend'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

export default function AdminTaskaiInsightsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { memberships, loading: membershipsLoading } = useTaskaiMemberships()

    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])
    const { orgId } = useTaskaiSelectedOrg(ownerMemberships, 'admin')
    const { kpi, analytics, loading: overviewLoading } = useTaskaiOverview(orgId)
    const { rows: activities, loading: activitiesLoading } = useTaskaiActivities(orgId, 8)
    const { data: trendData, loading: trendLoading } = useTaskaiTrend(orgId, 7)
    const loading = overviewLoading || activitiesLoading || trendLoading

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, user, router])

    if (authLoading || membershipsLoading || (ownerMemberships.length > 0 && !orgId)) {
        return (
            <TaskaiPageLoader
                title="Loading Organization Insights..."
                description="Waiting for organization analytics before rendering insights."
            />
        )
    }

    if (!user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">Loading...</div>
    }

    const completionRate = kpi?.totalTasks ? Math.round(((kpi?.completedTasks ?? 0) / kpi.totalTasks) * 100) : 0
    const pointsDistributed =
        analytics?.staffProductivity?.reduce((sum, staff) => sum + staff.pointsEarnedTotal, 0) ?? 0

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
                    <InsightsKpiRow
                        totalTasks={kpi?.totalTasks ?? 0}
                        completedTasks={kpi?.completedTasks ?? 0}
                        membersCount={kpi?.membersCount ?? 0}
                        pointsDistributed={pointsDistributed}
                        completionRate={completionRate}
                    />

                    <AiImpactBanner
                        completionRate={completionRate}
                        inProgressTasks={kpi?.inProgressTasks ?? 0}
                        membersCount={kpi?.membersCount ?? 0}
                    />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TaskCompletionRateCard
                            completionRate={completionRate}
                            open={kpi?.openTasks ?? 0}
                            inProgress={kpi?.inProgressTasks ?? 0}
                            completed={kpi?.completedTasks ?? 0}
                            avgPointsPerMember={analytics?.avgPointsPerMember ?? 0}
                        />
                        <WeeklyActivityChart data={trendData} loading={trendLoading} />
                    </div>

                    <OrganizationGoalsCard rows={analytics?.departmentContributions ?? []} />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <DepartmentContributionsCard rows={analytics?.departmentContributions ?? []} />
                        <StaffProductivityBreakdownCard rows={analytics?.staffProductivity ?? []} />
                    </div>

                    <div className="mt-6">
                        <RecentActivityFeed rows={activities} />
                    </div>

                    <div className="mt-6">
                        <QuarterlyRoiSummaryCard
                            completionRate={completionRate}
                            totalTasks={kpi?.totalTasks ?? 0}
                            completedTasks={kpi?.completedTasks ?? 0}
                            inProgressTasks={kpi?.inProgressTasks ?? 0}
                            membersCount={kpi?.membersCount ?? 0}
                            pointsDistributed={pointsDistributed}
                        />
                    </div>
                </>
            )}
        </div>
    )
}
