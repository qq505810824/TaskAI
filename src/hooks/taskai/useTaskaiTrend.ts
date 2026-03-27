'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useState } from 'react'

export type TaskaiTrendPoint = {
    date: string
    name: string
    claimed: number
    completed: number
    points: number
}

export function useTaskaiTrend(orgId: string | null, days = 7) {
    const { taskaiFetch } = useTaskaiApi()
    const [data, setData] = useState<TaskaiTrendPoint[]>([])
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!orgId) {
            setData([])
            return
        }
        setLoading(true)
        try {
            const res = await taskaiFetch(`/api/taskai/trend?orgId=${orgId}&days=${days}`)
            const json = await res.json()
            if (json.success) setData((json.data.trend || []) as TaskaiTrendPoint[])
            else setData([])
        } finally {
            setLoading(false)
        }
    }, [orgId, days, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { data, loading, refresh }
}
