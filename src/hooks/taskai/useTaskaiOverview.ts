'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useState } from 'react'

export type TaskaiOverviewKpi = {
    membersCount: number
    totalTasks: number
    openTasks: number
    inProgressTasks: number
    completedTasks: number
    myPoints: number
    myBalance: number
    myRank: number | null
    myInProgressTasks: number
    myCompletedTasks: number
    pointsPoolRemaining: number | null
}

export type TaskaiDepartmentContribution = {
    category: string
    tasks: number
    completed: number
    inProgress: number
    open: number
    points: number
}

export type TaskaiStaffProductivity = {
    userId: string
    role: 'owner' | 'member'
    name: string
    email: string | null
    avatarUrl: string | null
    pointsEarnedTotal: number
    tasksCompleted: number
    tasksInProgress: number
    tasksOpen: number
    totalAssigned: number
    completionRate: number
}

export type TaskaiOverviewAnalytics = {
    avgPointsPerMember: number
    departmentContributions: TaskaiDepartmentContribution[]
    staffProductivity: TaskaiStaffProductivity[]
}

export function useTaskaiOverview(orgId: string | null) {
    const { taskaiFetch } = useTaskaiApi()
    const [kpi, setKpi] = useState<TaskaiOverviewKpi | null>(null)
    const [analytics, setAnalytics] = useState<TaskaiOverviewAnalytics | null>(null)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!orgId) {
            setKpi(null)
            setAnalytics(null)
            return
        }
        setLoading(true)
        try {
            const res = await taskaiFetch(`/api/taskai/overview?orgId=${orgId}`)
            const json = await res.json()
            if (json.success) {
                setKpi(json.data.kpi as TaskaiOverviewKpi)
                setAnalytics((json.data.analytics ?? null) as TaskaiOverviewAnalytics | null)
            } else {
                setKpi(null)
                setAnalytics(null)
            }
        } finally {
            setLoading(false)
        }
    }, [orgId, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { kpi, analytics, loading, refresh }
}
