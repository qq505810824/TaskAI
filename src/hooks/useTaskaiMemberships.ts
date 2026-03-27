'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import type { TaskaiMembership } from '@/types/taskai'
import { useCallback, useEffect, useState } from 'react'

export function useTaskaiMemberships() {
    const { taskaiFetch, hasToken } = useTaskaiApi()
    const [memberships, setMemberships] = useState<TaskaiMembership[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        if (!hasToken) {
            setMemberships([])
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const res = await taskaiFetch('/api/taskai/memberships')
            const json = await res.json()
            if (!json.success) {
                throw new Error(json.message || 'Failed to load memberships')
            }
            const raw = json.data.memberships as TaskaiMembership[]
            setMemberships(
                raw
                    .filter((m) => m.organization !== null)
                    .map((m) => ({ ...m, organization: m.organization! }))
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
            setMemberships([])
        } finally {
            setLoading(false)
        }
    }, [hasToken, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { memberships, loading, error, refresh }
}
