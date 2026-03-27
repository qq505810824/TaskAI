'use client'

import { useAuth } from '@/hooks/useAuth'
import { useCallback } from 'react'

/** TaskAI API 调用统一附带 Bearer（与 /api/users/current 一致） */
export function useTaskaiApi() {
    const { user } = useAuth()

    const taskaiFetch = useCallback(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const headers = new Headers(init?.headers)
            const token = user?.token
            if (token) headers.set('Authorization', `Bearer ${token}`)
            return fetch(input, { ...init, headers })
        },
        [user?.token]
    )

    return { taskaiFetch, hasToken: !!user?.token, user }
}
