import { cn } from '@/lib/utils'
import { formatTaskaiDateTime } from '@/lib/taskai/date-format'
import type { TaskaiTaskRow, TaskaiTaskStatus, TaskaiTaskType } from '@/types/taskai'
import {
    Brain,
    CheckCircle2,
    Columns3,
    Hand,
    LayoutList,
    Loader2,
    Pencil,
    Search,
    Trash2,
} from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { TaskBoardKanban } from './TaskBoardKanban'
import { TaskStatusBadge } from './TaskStatusBadge'
import { TaskTypeBadge } from './TaskTypeBadge'

type Mode = 'owner' | 'member'
type SortKey = 'updated_desc' | 'points_desc' | 'title_asc'
type StatusFilter = 'all' | TaskaiTaskStatus
type TypeFilter = 'all' | TaskaiTaskType
type ViewMode = 'table' | 'board'

function sortTasks(tasks: TaskaiTaskRow[], sortKey: SortKey) {
    const next = [...tasks]
    if (sortKey === 'points_desc') {
        next.sort((a, b) => b.points - a.points)
        return next
    }
    if (sortKey === 'title_asc') {
        next.sort((a, b) => a.title.localeCompare(b.title))
        return next
    }
    next.sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at).getTime()
        const timeB = new Date(b.updated_at || b.created_at).getTime()
        return timeB - timeA
    })
    return next
}

function matchesTaskSearch(task: TaskaiTaskRow, query: string) {
    if (!query) return true
    const haystack = [
        task.title,
        task.description ?? '',
        task.project_name ?? '',
        task.category ?? '',
        task.assignee_display_name ?? '',
        task.status,
        task.type,
    ]
        .join('\n')
        .toLowerCase()
    return haystack.includes(query.toLowerCase())
}

function getStatusCount(tasks: TaskaiTaskRow[], status: TaskaiTaskStatus) {
    return tasks.filter((task) => task.status === status).length
}

function RowActionButtons({
    task,
    mode,
    currentUserId,
    onClaim,
    onComplete,
    onWorkWithAi,
    claimingTaskId,
    onOwnerEditTask,
    onOwnerDeleteTask,
    onViewTaskDetail,
}: {
    task: TaskaiTaskRow
    mode: Mode
    currentUserId: string | undefined
    onClaim: (id: string) => void
    onComplete: (t: TaskaiTaskRow) => void
    onWorkWithAi?: (t: TaskaiTaskRow) => void
    claimingTaskId?: string | null
    onOwnerEditTask?: (t: TaskaiTaskRow) => void
    onOwnerDeleteTask?: (t: TaskaiTaskRow) => void
    onViewTaskDetail?: (t: TaskaiTaskRow) => void
}) {
    const isMyTask = task.assignee_user_id === currentUserId

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {onViewTaskDetail ? (
                <button
                    type="button"
                    onClick={() => onViewTaskDetail(task)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    Open
                </button>
            ) : null}

            {mode === 'owner' && task.status === 'open' && onOwnerEditTask ? (
                <button
                    type="button"
                    onClick={() => onOwnerEditTask(task)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </button>
            ) : null}

            {mode === 'owner' && task.status === 'open' && onOwnerDeleteTask ? (
                <button
                    type="button"
                    onClick={() => onOwnerDeleteTask(task)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                </button>
            ) : null}

            {mode === 'member' && task.status === 'open' ? (
                <button
                    type="button"
                    disabled={claimingTaskId != null}
                    onClick={() => onClaim(task.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                    {claimingTaskId === task.id ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Joining...
                        </>
                    ) : (
                        <>
                            <Hand className="h-3.5 w-3.5" />
                            Join
                        </>
                    )}
                </button>
            ) : null}

            {mode === 'member' && task.status === 'in_progress' && isMyTask && onWorkWithAi ? (
                <button
                    type="button"
                    onClick={() => onWorkWithAi(task)}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                    <Brain className="h-3.5 w-3.5" />
                    AI
                </button>
            ) : null}

            {mode === 'member' && task.status === 'in_progress' && isMyTask ? (
                <button
                    type="button"
                    onClick={() => onComplete(task)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    📝 Add Progress Update
                </button>
            ) : null}
        </div>
    )
}

function TaskBoardDatabaseViewImpl({
    tasks,
    mode,
    currentUserId,
    onClaim,
    onComplete,
    onWorkWithAi,
    claimingTaskId,
    onOwnerEditTask,
    onOwnerDeleteTask,
    onViewTaskDetail,
    defaultViewMode = 'table',
}: {
    tasks: TaskaiTaskRow[]
    mode: Mode
    currentUserId: string | undefined
    onClaim: (id: string) => void
    onComplete: (t: TaskaiTaskRow) => void
    onWorkWithAi?: (t: TaskaiTaskRow) => void
    claimingTaskId?: string | null
    onOwnerEditTask?: (t: TaskaiTaskRow) => void
    onOwnerDeleteTask?: (t: TaskaiTaskRow) => void
    onViewTaskDetail?: (t: TaskaiTaskRow) => void
    defaultViewMode?: ViewMode
}) {
    const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [projectFilter, setProjectFilter] = useState('all')
    const [sortKey, setSortKey] = useState<SortKey>('updated_desc')

    const projectOptions = useMemo(
        () => [...new Set(tasks.map((task) => task.project_name?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
        [tasks]
    )

    const filteredTasks = useMemo(() => {
        const next = tasks.filter((task) => {
            if (!matchesTaskSearch(task, search)) return false
            if (statusFilter !== 'all' && task.status !== statusFilter) return false
            if (typeFilter !== 'all' && task.type !== typeFilter) return false
            if (projectFilter === 'none' && task.project_name?.trim()) return false
            if (projectFilter !== 'all' && projectFilter !== 'none' && task.project_name?.trim() !== projectFilter) return false
            return true
        })
        return sortTasks(next, sortKey)
    }, [projectFilter, search, sortKey, statusFilter, tasks, typeFilter])

    const openCount = useMemo(() => getStatusCount(filteredTasks, 'open'), [filteredTasks])
    const inProgressCount = useMemo(() => getStatusCount(filteredTasks, 'in_progress'), [filteredTasks])
    const completedCount = useMemo(() => getStatusCount(filteredTasks, 'completed'), [filteredTasks])

    return (
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {filteredTasks.length} shown
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                Open {openCount}
                            </span>
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                In Progress {inProgressCount}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                Completed {completedCount}
                            </span>
                        </div>
                    </div>

                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <LayoutList className="h-4 w-4" />
                            Table
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('board')}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                                viewMode === 'board' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <Columns3 className="h-4 w-4" />
                            Board
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(0,1fr))]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search task, project, category, assignee..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                        />
                    </label>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>

                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                    >
                        <option value="all">All Projects</option>
                        {tasks.some((task) => !task.project_name?.trim()) ? <option value="none">No Project</option> : null}
                        {projectOptions.map((projectName) => (
                            <option key={projectName} value={projectName}>
                                {projectName}
                            </option>
                        ))}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                    >
                        <option value="all">All Types</option>
                        <option value="one_time">One-time</option>
                        <option value="recurring">Recurring</option>
                    </select>

                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                    >
                        <option value="updated_desc">Recently Updated</option>
                        <option value="points_desc">Highest Points</option>
                        <option value="title_asc">Title A-Z</option>
                    </select>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                {viewMode === 'board' ? (
                    <TaskBoardKanban
                        tasks={filteredTasks}
                        mode={mode}
                        currentUserId={currentUserId}
                        onClaim={onClaim}
                        onComplete={onComplete}
                        onWorkWithAi={onWorkWithAi}
                        claimDisabled={claimingTaskId != null}
                        claimingTaskId={claimingTaskId}
                        onOwnerEditTask={onOwnerEditTask}
                        onOwnerDeleteTask={onOwnerDeleteTask}
                        onViewTaskDetail={onViewTaskDetail}
                    />
                ) : filteredTasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                        No tasks match the current search or filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Task</th>
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Points</th>
                                    <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Updated</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredTasks.map((task) => (
                                    <tr key={task.id} className="align-top transition hover:bg-slate-50/70">
                                        <td className="px-4 py-4">
                                            <div className="min-w-[260px]">
                                                <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {task.project_name?.trim() || '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <TaskStatusBadge status={task.status} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <TaskTypeBadge type={task.type} />
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {task.category?.trim() || 'General'}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                                            {task.points}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {task.assignee_display_name?.trim() || 'Unassigned'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500">
                                            {formatTaskaiDateTime(task.updated_at || task.created_at)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <RowActionButtons
                                                task={task}
                                                mode={mode}
                                                currentUserId={currentUserId}
                                                onClaim={onClaim}
                                                onComplete={onComplete}
                                                onWorkWithAi={onWorkWithAi}
                                                claimingTaskId={claimingTaskId}
                                                onOwnerEditTask={onOwnerEditTask}
                                                onOwnerDeleteTask={onOwnerDeleteTask}
                                                onViewTaskDetail={onViewTaskDetail}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    )
}

export const TaskBoardDatabaseView = memo(
    TaskBoardDatabaseViewImpl,
    (prev, next) =>
        prev.tasks === next.tasks &&
        prev.mode === next.mode &&
        prev.currentUserId === next.currentUserId &&
        prev.onClaim === next.onClaim &&
        prev.onComplete === next.onComplete &&
        prev.onWorkWithAi === next.onWorkWithAi &&
        prev.claimingTaskId === next.claimingTaskId &&
        prev.onOwnerEditTask === next.onOwnerEditTask &&
        prev.onOwnerDeleteTask === next.onOwnerDeleteTask &&
        prev.onViewTaskDetail === next.onViewTaskDetail &&
        prev.defaultViewMode === next.defaultViewMode,
)
