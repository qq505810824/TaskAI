'use client'

import { fetchTaskaiJson } from '@/hooks/taskai/fetchTaskaiJson'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useRef, useState } from 'react'

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
    const requestIdRef = useRef(0)

    const load = useCallback(async (force = false) => {
        const requestId = ++requestIdRef.current
        if (!orgId) {
            setData([])
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const url = `/api/taskai/trend?orgId=${orgId}&days=${days}`
            const json = await fetchTaskaiJson<{ success: boolean; data?: { trend?: TaskaiTrendPoint[] } }>(
                taskaiFetch,
                url,
                undefined,
                {
                    dedupeKey: url,
                    force,
                }
            )
            if (requestId !== requestIdRef.current) return
            if (json.success) setData((json.data?.trend || []) as TaskaiTrendPoint[])
            else setData([])
        } finally {
            if (requestId !== requestIdRef.current) return
            setLoading(false)
        }
    }, [orgId, days, taskaiFetch])

    const refresh = useCallback(async () => {
        await load(true)
    }, [load])

    useEffect(() => {
        void load(false)
    }, [load])

    return { data, loading, refresh }
}
