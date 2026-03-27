'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MemberTaskaiOverviewPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) router.replace('/login')
    }, [isLoading, user, router])

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slate-800">我的总览</h1>
            <p className="mt-2 text-sm text-slate-500">
                个人排名与目标贡献将在此接入（开发中）。请使用{' '}
                <a href="/taskai/tasks" className="text-indigo-600 underline">
                    任务板
                </a>
                。
            </p>
        </div>
    )
}
