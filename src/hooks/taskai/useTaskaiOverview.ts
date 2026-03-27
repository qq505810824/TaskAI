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

export function useTaskaiOverview(orgId: string | null) {
    const { taskaiFetch } = useTaskaiApi()
    const [kpi, setKpi] = useState<TaskaiOverviewKpi | null>(null)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!orgId) {
            setKpi(null)
            return
        }
        setLoading(true)
        try {
            const res = await taskaiFetch(`/api/taskai/overview?orgId=${orgId}`)
            const json = await res.json()
            if (json.success) setKpi(json.data.kpi as TaskaiOverviewKpi)
            else setKpi(null)
        } finally {
            setLoading(false)
        }
    }, [orgId, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { kpi, loading, refresh }
}
