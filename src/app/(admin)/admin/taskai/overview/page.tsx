'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminTaskaiOverviewPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) router.replace('/login')
    }, [isLoading, user, router])

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slate-800">组织总览</h1>
            <p className="mt-2 text-sm text-slate-500">
                KPI、目标进度与排行榜等将在此页接入（开发中）。请先使用{' '}
                <a href="/admin/taskai/tasks" className="text-indigo-600 underline">
                    任务板
                </a>
                。
            </p>
        </div>
    )
}
