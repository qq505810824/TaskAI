'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const tabs = [
    { href: '/taskai/tasks', label: '任务' },
    { href: '/taskai/overview', label: '总览' },
    { href: '/taskai/partners', label: '伙伴' },
]

export default function TaskaiMemberLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    return (
        <div>
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl gap-1 px-4 py-2 sm:px-6 lg:px-8">
                    {tabs.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={cn(
                                'rounded-xl px-4 py-2 text-sm font-medium transition',
                                pathname === t.href || pathname.startsWith(t.href + '/')
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            )}
                        >
                            {t.label}
                        </Link>
                    ))}
                </div>
            </div>
            {children}
        </div>
    )
}
