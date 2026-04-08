"use client";

import { Header } from "@/components/layout/Header";
import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'
import { useAuth } from '@/hooks/useAuth'
import SwrInitor from "@/contexts/swr-initor";
import { cn } from '@/lib/utils';
import { BarChart3, BellRing, LayoutGrid, MessagesSquare, Target, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from 'react'

const tabs = [
    {
        href: '/admin/taskai/projects',
        label: 'Project Management',
        icon: Target,
        /** 与首页 /admin 同源内容时，同步高亮本 Tab */
        activeWhenExact: ['/admin'],
    },
    { href: '/admin/taskai/tasks', label: 'Task Board', icon: LayoutGrid },
    { href: '/admin/taskai/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/admin/taskai/insights', label: 'Org Insights', icon: BarChart3 },
    { href: '/admin/taskai/prompts', label: 'Prompt Management', icon: MessagesSquare },
    { href: '/admin/taskai/notifications', label: 'Notifications', icon: BellRing },
    { href: '/admin/taskai/members', label: 'Team', icon: Users },
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname();
    const isTaskaiAdmin = pathname.startsWith('/admin');

    useEffect(() => {
        if (isLoading) return
        if (!user) {
            router.replace('/login?redirect=/admin')
            return
        }
        if (user.role !== 'admin') {
            router.replace('/taskai/tasks')
        }
    }, [isLoading, router, user])

    if (isLoading || !user || user.role !== 'admin') {
        return <TaskaiPageLoader title="Checking admin access..." />
    }

    return (
        <SwrInitor>
            <div className={isTaskaiAdmin ? "min-h-screen bg-slate-50" : "min-h-screen bg-gray-50"}>
                <Header
                    taskaiBrand={isTaskaiAdmin}
                    showMarketingNav={!isTaskaiAdmin}
                    brandHref={isTaskaiAdmin ? "/" : "/"}
                />
                <div className="bg-slate-50">
                    <div className="mx-auto max-w-7xl px-4 pb-3 pt-4 sm:px-6 lg:px-8">
                        <div className="flex max-w-fit flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                            {tabs.map((t) => {
                                const exactExtras: string[] =
                                    'activeWhenExact' in t && Array.isArray(t.activeWhenExact)
                                        ? [...t.activeWhenExact]
                                        : []
                                const isActive =
                                    pathname === t.href ||
                                    pathname.startsWith(t.href + '/') ||
                                    exactExtras.includes(pathname)
                                return (
                                    <Link
                                        key={t.href}
                                        href={t.href}
                                        className={cn(
                                            'tab-btn flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:px-5',
                                            isActive
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                        )}
                                    >
                                        <t.icon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{t.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
                {children}
            </div>
            {/* <div className={isTaskaiAdmin ? "min-h-screen bg-slate-50" : "min-h-screen bg-gray-50"}>
                <Header
                    taskaiBrand={isTaskaiAdmin}
                    showMarketingNav={!isTaskaiAdmin}
                    brandHref={isTaskaiAdmin ? "/admin/taskai/tasks" : "/"}
                />
                <main className="h-full">{children}</main>
            </div> */}
        </SwrInitor>
    );
}
