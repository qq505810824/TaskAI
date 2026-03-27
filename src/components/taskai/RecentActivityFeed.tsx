'use client'

import type { TaskaiActivityRow } from '@/hooks/taskai/useTaskaiActivities'
import { taskaiActivityText, taskaiRelativeTime } from '@/lib/taskai/activity-text'
import { ArrowRight, Check, Clock3 } from 'lucide-react'

export function RecentActivityFeed({
    rows,
    title = 'Recent Activity',
    subtitle = 'Latest task updates across the organization',
    emptyText = 'No activity yet',
    compact = false,
}: {
    rows: TaskaiActivityRow[]
    title?: string
    subtitle?: string
    emptyText?: string
    compact?: boolean
}) {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4 sm:p-5' : 'p-6'}`}>
            <h3 className={`font-bold text-slate-800 ${compact ? 'mb-0.5 text-base' : 'mb-1'}`}>{title}</h3>
            <p className={`text-slate-400 ${compact ? 'mb-3 text-[11px]' : 'mb-5 text-xs'}`}>{subtitle}</p>

            <div className="relative space-y-0">
                <div className={`absolute bottom-2 top-2 w-px bg-slate-200 ${compact ? 'left-3.5' : 'left-4'}`} />
                {rows.map((a) => {
                    const isComplete = a.event_type === 'task_completed'
                    const taskTitle =
                        a.task_title ||
                        (a.meta && typeof a.meta === 'object' && 'task_title' in a.meta
                            ? String((a.meta as Record<string, unknown>).task_title ?? '')
                            : '')
                    return (
                        <div key={a.id} className={`relative flex items-start ${compact ? 'gap-3 pb-4' : 'gap-4 pb-5'}`}>
                            <div
                                className={`z-10 flex shrink-0 items-center justify-center rounded-full border-2 border-white ${
                                    compact ? 'h-7 w-7' : 'h-8 w-8'
                                } ${
                                    isComplete ? 'bg-emerald-100' : 'bg-blue-100'
                                }`}
                            >
                                {isComplete ? (
                                    <Check className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-emerald-600`} />
                                ) : (
                                    <ArrowRight className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-blue-600`} />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`${compact ? 'text-[13px]' : 'text-sm'} text-slate-700`}>
                                    <span className="font-semibold">{a.actor_name || 'System'}</span>
                                    <span className="text-slate-500"> {taskaiActivityText(a.event_type)} </span>
                                    {taskTitle ? <span className="font-semibold">{taskTitle}</span> : null}
                                </p>
                                <div className={`mt-1 flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
                                    <span className={`inline-flex items-center gap-1 text-slate-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                                        <Clock3 className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                                        {taskaiRelativeTime(a.created_at)}
                                    </span>
                                    {a.points_delta > 0 ? (
                                        <span
                                            className={`rounded-full bg-emerald-50 font-bold text-emerald-600 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
                                        >
                                            +{a.points_delta} pts
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )
                })}
                {!rows.length ? <p className="py-3 text-sm text-slate-400">{emptyText}</p> : null}
            </div>
        </div>
    )
}
