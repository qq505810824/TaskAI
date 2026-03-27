import { cn } from '@/lib/utils'
import type { TaskaiTaskRow } from '@/types/taskai'
import { Brain, Hand, Pencil, Star, Trash2 } from 'lucide-react'
import { TaskStatusBadge } from './TaskStatusBadge'
import { TaskTypeBadge } from './TaskTypeBadge'

export type TaskCardProps = {
    task: TaskaiTaskRow
    index?: number
    /** 当前登录用户 id */
    currentUserId: string | undefined
    /** member: 展示认领；assignee: 展示完成/AI */
    mode: 'owner' | 'member'
    onClaim: (taskId: string) => void
    onComplete: (task: TaskaiTaskRow) => void
    onWorkWithAi?: (task: TaskaiTaskRow) => void
    claimingId?: string | null
    onOwnerEdit?: (task: TaskaiTaskRow) => void
    onOwnerDelete?: (task: TaskaiTaskRow) => void
}

export function TaskCard({
    task,
    index = 0,
    currentUserId,
    mode,
    onClaim,
    onComplete,
    onWorkWithAi,
    claimingId,
    onOwnerEdit,
    onOwnerDelete,
}: TaskCardProps) {
    const isMyTask = task.assignee_user_id === currentUserId

    return (
        <div
            className={cn(
                'taskai-card-hover taskai-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
            )}
            style={{ animationDelay: `${index * 0.06}s` }}
        >
            <div className="mb-2 flex items-start justify-between">
                <TaskStatusBadge status={task.status} />
                <TaskTypeBadge type={task.type} />
            </div>
            <h4 className="mt-3 text-sm font-bold leading-snug text-slate-800">{task.title}</h4>
            {task.description ? (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{task.description}</p>
            ) : null}
            {task.category ? (
                <span className="mt-2 inline-block rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400">
                    {task.category}
                </span>
            ) : null}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-amber-400" aria-hidden />
                    <span className="text-sm font-bold text-slate-700">{task.points}</span>
                    <span className="text-xs text-slate-400">pts</span>
                </div>
                {task.assignee_user_id && task.assignee_display_name ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">
                            {task.assignee_display_name.split(/\s+/)[0]}
                        </span>
                    </div>
                ) : null}
            </div>
            {mode === 'owner' && task.status === 'open' ? (
                <div className="mt-3 flex gap-2">
                    {onOwnerEdit ? (
                        <button
                            type="button"
                            onClick={() => onOwnerEdit(task)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                        </button>
                    ) : null}
                    {onOwnerDelete ? (
                        <button
                            type="button"
                            onClick={() => onOwnerDelete(task)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Delete
                        </button>
                    ) : null}
                </div>
            ) : null}
            {mode === 'member' && task.status === 'open' ? (
                <button
                    type="button"
                    disabled={!!claimingId}
                    onClick={() => onClaim(task.id)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                    <Hand className="h-3 w-3 text-white" aria-hidden />
                    Join Task
                </button>
            ) : null}
            {mode === 'member' && task.status === 'in_progress' && isMyTask ? (
                <div className="mt-3 flex flex-col gap-2">
                    {onWorkWithAi ? (
                        <button
                            type="button"
                            onClick={() => onWorkWithAi(task)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700"
                        >
                            <Brain className="h-3 w-3 text-white" aria-hidden />
                            Work with AI
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => onComplete(task)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                        标记完成
                    </button>
                </div>
            ) : null}
        </div>
    )
}
