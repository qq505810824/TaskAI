'use client'

import { fetchTaskaiJson } from '@/hooks/taskai/fetchTaskaiJson'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useRef, useState } from 'react'

export type TaskaiActivityRow = {
    id: string
    event_type: string
    points_delta: number
    created_at: string
    actor_name: string | null
    meta?: Record<string, unknown> | null
    task_title?: string | null
}

export function useTaskaiActivities(orgId: string | null, limit = 8) {
    const { taskaiFetch } = useTaskaiApi()
    const [rows, setRows] = useState<TaskaiActivityRow[]>([])
    const [loading, setLoading] = useState(false)
    const requestIdRef = useRef(0)

    const load = useCallback(async (force = false) => {
        const requestId = ++requestIdRef.current
        if (!orgId) {
            setRows([])
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const url = `/api/taskai/activities?orgId=${orgId}&limit=${limit}`
            const json = await fetchTaskaiJson<{ success: boolean; data?: { activities?: TaskaiActivityRow[] } }>(
                taskaiFetch,
                url,
                undefined,
                {
                    dedupeKey: url,
                    force,
                }
            )
            if (requestId !== requestIdRef.current) return
            if (json.success) setRows((json.data?.activities || []) as TaskaiActivityRow[])
            else setRows([])
        } finally {
            if (requestId !== requestIdRef.current) return
            setLoading(false)
        }
    }, [orgId, limit, taskaiFetch])

    const refresh = useCallback(async () => {
        await load(true)
    }, [load])

    useEffect(() => {
        void load(false)
    }, [load])

    return { rows, loading, refresh }
}
