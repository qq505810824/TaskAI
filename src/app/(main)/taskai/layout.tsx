'use client'

import { cn } from '@/lib/utils'
import { LayoutGrid, Trophy } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const tabs = [
    { href: '/taskai/tasks', label: 'Task Board', icon: LayoutGrid },
    { href: '/taskai/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export default function TaskaiMemberLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    return (
        <div>
            <div className="bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 pb-3 pt-4 sm:px-6 lg:px-8">
                    <div className="flex max-w-fit flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                        {tabs.map((t) => (
                            <Link
                                key={t.href}
                                href={t.href}
                                className={cn(
                                    'tab-btn flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:px-5',
                                    pathname === t.href || pathname.startsWith(t.href + '/')
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                )}
                            >
                                <t.icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}
