'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminTaskaiMembersPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) router.replace('/login')
    }, [isLoading, user, router])

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slate-800">成员与群组</h1>
            <p className="mt-2 text-sm text-slate-500">
                邀请链接、群组与成员管理将在此接入（开发中）。
            </p>
        </div>
    )
}
