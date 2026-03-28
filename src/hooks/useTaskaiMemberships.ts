'use client'

import { fetchTaskaiJson } from '@/hooks/taskai/fetchTaskaiJson'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import type { TaskaiMembership } from '@/types/taskai'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useTaskaiMemberships() {
    const { taskaiFetch, hasToken } = useTaskaiApi()
    const [memberships, setMemberships] = useState<TaskaiMembership[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const requestIdRef = useRef(0)

    const load = useCallback(async (force = false) => {
        const requestId = ++requestIdRef.current
        if (!hasToken) {
            setMemberships([])
            setError(null)
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const json = await fetchTaskaiJson<{ success: boolean; message?: string; data?: { memberships?: TaskaiMembership[] } }>(
                taskaiFetch,
                '/api/taskai/memberships',
                undefined,
                {
                    dedupeKey: '/api/taskai/memberships',
                    force,
                }
            )
            if (requestId !== requestIdRef.current) return
            if (!json.success) {
                throw new Error(json.message || 'Failed to load memberships')
            }
            const raw = (json.data?.memberships ?? []) as TaskaiMembership[]
            setMemberships(
                raw
                    .filter((m) => m.organization !== null)
                    .map((m) => ({ ...m, organization: m.organization! }))
            )
        } catch (e) {
            if (requestId !== requestIdRef.current) return
            setError(e instanceof Error ? e.message : 'Unknown error')
            setMemberships([])
        } finally {
            if (requestId !== requestIdRef.current) return
            setLoading(false)
        }
    }, [hasToken, taskaiFetch])

    const refresh = useCallback(async () => {
        await load(true)
    }, [load])

    useEffect(() => {
        void load(false)
    }, [load])

    return { memberships, loading, error, refresh }
}
