'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useCallback } from 'react'

/** TaskAI API 调用统一附带 Bearer（与 /api/users/current 一致） */
export function useTaskaiApi() {
    const { user } = useAuth()

    const taskaiFetch = useCallback(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const headers = new Headers(init?.headers)
            // 优先读取 Supabase 当前会话 token，避免切账号后沿用旧 token 导致 401
            const {
                data: { session },
            } = await supabase.auth.getSession()
            const token = session?.access_token ?? user?.token
            if (token) headers.set('Authorization', `Bearer ${token}`)
            return fetch(input, { ...init, headers })
        },
        [user?.token]
    )

    return { taskaiFetch, hasToken: !!user, user }
}
