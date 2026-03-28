'use client'

import { fetchTaskaiJson } from '@/hooks/taskai/fetchTaskaiJson'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useRef, useState } from 'react'

export type TaskaiLeaderboardRow = {
    rank: number
    user_id: string
    points_earned_total: number
    role?: string
    user: { name: string | null; email: string | null, avatar_url: string | null }
    is_me: boolean
}

export function useTaskaiLeaderboard(orgId: string | null) {
    const { taskaiFetch } = useTaskaiApi()
    const [rows, setRows] = useState<TaskaiLeaderboardRow[]>([])
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
            const url = `/api/taskai/leaderboard?orgId=${orgId}`
            const json = await fetchTaskaiJson<{ success: boolean; data?: { leaderboard?: TaskaiLeaderboardRow[] } }>(
                taskaiFetch,
                url,
                undefined,
                {
                    dedupeKey: url,
                    force,
                }
            )
            if (requestId !== requestIdRef.current) return
            if (json.success) setRows((json.data?.leaderboard || []) as TaskaiLeaderboardRow[])
            else setRows([])
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

    return { rows, loading, refresh }
}
