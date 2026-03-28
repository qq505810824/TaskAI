'use client'

import { fetchTaskaiJson } from '@/hooks/taskai/fetchTaskaiJson'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useRef, useState } from 'react'

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
    const requestIdRef = useRef(0)

    const load = useCallback(async (force = false) => {
        const requestId = ++requestIdRef.current
        if (!orgId) {
            setKpi(null)
            setAnalytics(null)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const url = `/api/taskai/overview?orgId=${orgId}`
            const json = await fetchTaskaiJson<{
                success: boolean
                data?: { kpi?: TaskaiOverviewKpi; analytics?: TaskaiOverviewAnalytics | null }
            }>(taskaiFetch, url, undefined, {
                dedupeKey: url,
                force,
            })
            if (requestId !== requestIdRef.current) return
            if (json.success) {
                setKpi((json.data?.kpi ?? null) as TaskaiOverviewKpi | null)
                setAnalytics((json.data?.analytics ?? null) as TaskaiOverviewAnalytics | null)
            } else {
                setKpi(null)
                setAnalytics(null)
            }
        } finally {
            if (requestId !== requestIdRef.current) return
            setLoading(false)
        }
    }, [orgId, taskaiFetch])

    const refresh = useCallback(async () => {
        await load(true)
    }, [load])

    useEffect(() => {
        void load(false)
    }, [load])

    return { kpi, analytics, loading, refresh }
}
