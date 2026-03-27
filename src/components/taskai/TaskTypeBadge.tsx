import type { TaskaiTaskType } from '@/types/taskai'
import { cn } from '@/lib/utils'
import { Bolt, RefreshCw } from 'lucide-react'

export function TaskTypeBadge({ type }: { type: TaskaiTaskType }) {
    const isRecurring = type === 'recurring'
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                isRecurring ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
            )}
        >
            {isRecurring ? (
                <RefreshCw className="h-3 w-3" aria-hidden />
            ) : (
                <Bolt className="h-3 w-3" aria-hidden />
            )}
            {isRecurring ? 'Recurring' : 'One-time'}
        </span>
    )
}
