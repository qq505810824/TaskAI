'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import type { TaskaiTaskRow } from '@/types/taskai'
import { useCallback, useEffect, useState } from 'react'

export function useTaskaiTasks(orgId: string | null) {
    const { taskaiFetch, hasToken } = useTaskaiApi()
    const [tasks, setTasks] = useState<TaskaiTaskRow[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        if (!hasToken || !orgId) {
            setTasks([])
            return
        }
        try {
            setLoading(true)
            setError(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/tasks`)
            const json = await res.json()
            if (!json.success) {
                throw new Error(json.message || 'Failed to load tasks')
            }
            setTasks(json.data.tasks as TaskaiTaskRow[])
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
            setTasks([])
        } finally {
            setLoading(false)
        }
    }, [hasToken, orgId, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { tasks, loading, error, refresh, setTasks }
}
