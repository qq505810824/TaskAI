import type { TaskaiTaskStatus } from '@/types/taskai'
import { cn } from '@/lib/utils'

const LABELS: Record<TaskaiTaskStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    completed: 'Completed',
}

const STYLES: Record<TaskaiTaskStatus, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
}

export function TaskStatusBadge({ status }: { status: TaskaiTaskStatus }) {
    return (
        <span
            className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                STYLES[status]
            )}
        >
            {LABELS[status]}
        </span>
    )
}
