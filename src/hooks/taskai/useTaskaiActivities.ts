'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useState } from 'react'

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

    const refresh = useCallback(async () => {
        if (!orgId) {
            setRows([])
            return
        }
        setLoading(true)
        try {
            const res = await taskaiFetch(`/api/taskai/activities?orgId=${orgId}&limit=${limit}`)
            const json = await res.json()
            if (json.success) setRows((json.data.activities || []) as TaskaiActivityRow[])
            else setRows([])
        } finally {
            setLoading(false)
        }
    }, [orgId, limit, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { rows, loading, refresh }
}
