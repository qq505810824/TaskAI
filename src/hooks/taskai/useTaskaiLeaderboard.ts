'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useState } from 'react'

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

    const refresh = useCallback(async () => {
        if (!orgId) {
            setRows([])
            return
        }
        setLoading(true)
        try {
            const res = await taskaiFetch(`/api/taskai/leaderboard?orgId=${orgId}`)
            const json = await res.json()
            if (json.success) setRows((json.data.leaderboard || []) as TaskaiLeaderboardRow[])
            else setRows([])
        } finally {
            setLoading(false)
        }
    }, [orgId, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { rows, loading, refresh }
}
