'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useEffect, useRef } from 'react'

export function TaskaiPromptBootstrap() {
    const { user, isLoading } = useAuth()
    const { taskaiFetch } = useTaskaiApi()
    const bootstrappedUserIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (isLoading) return
        if (!user?.id) {
            bootstrappedUserIdRef.current = null
            return
        }
        if (bootstrappedUserIdRef.current === user.id) return

        bootstrappedUserIdRef.current = user.id
        void taskaiFetch('/api/taskai/prompts/bootstrap', { method: 'POST' }).catch(() => {
            // Bootstrap should never block app usage.
        })
    }, [isLoading, taskaiFetch, user?.id])

    return null
}
