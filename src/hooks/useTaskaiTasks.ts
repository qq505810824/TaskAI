'use client'

import { fetchTaskaiJson } from '@/hooks/taskai/fetchTaskaiJson'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import type { TaskaiTaskRow } from '@/types/taskai'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useTaskaiTasks(orgId: string | null) {
    const { taskaiFetch, hasToken } = useTaskaiApi()
    const [tasks, setTasks] = useState<TaskaiTaskRow[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const requestIdRef = useRef(0)

    const load = useCallback(async (force = false) => {
        const requestId = ++requestIdRef.current
        if (!hasToken || !orgId) {
            setTasks([])
            setError(null)
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const url = `/api/taskai/orgs/${orgId}/tasks`
            const json = await fetchTaskaiJson<{ success: boolean; message?: string; data?: { tasks?: TaskaiTaskRow[] } }>(
                taskaiFetch,
                url,
                undefined,
                {
                    dedupeKey: url,
                    force,
                }
            )
            if (requestId !== requestIdRef.current) return
            if (!json.success) {
                throw new Error(json.message || 'Failed to load tasks')
            }
            setTasks((json.data?.tasks ?? []) as TaskaiTaskRow[])
        } catch (e) {
            if (requestId !== requestIdRef.current) return
            setError(e instanceof Error ? e.message : 'Unknown error')
            setTasks([])
        } finally {
            if (requestId !== requestIdRef.current) return
            setLoading(false)
        }
    }, [hasToken, orgId, taskaiFetch])

    const refresh = useCallback(async () => {
        await load(true)
    }, [load])

    useEffect(() => {
        void load(false)
    }, [load])

    return { tasks, loading, error, refresh, setTasks }
}
