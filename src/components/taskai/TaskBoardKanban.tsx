import type { TaskaiTaskRow } from '@/types/taskai'
import { TaskCard } from './TaskCard'

type Mode = 'owner' | 'member'

export function TaskBoardKanban({
    tasks,
    mode,
    currentUserId,
    onClaim,
    onComplete,
    onWorkWithAi,
    claimingId,
}: {
    tasks: TaskaiTaskRow[]
    mode: Mode
    currentUserId: string | undefined
    onClaim: (id: string) => void
    onComplete: (t: TaskaiTaskRow) => void
    onWorkWithAi?: (t: TaskaiTaskRow) => void
    claimingId?: string | null
}) {
    const open = tasks.filter((t) => t.status === 'open')
    const inProgress = tasks.filter((t) => t.status === 'in_progress')
    const completed = tasks.filter((t) => t.status === 'completed')

    const Col = ({
        title,
        countClass,
        list,
        dotColor,
    }: {
        title: string
        countClass: string
        list: TaskaiTaskRow[]
        dotColor: string
    }) => (
        <div>
            <div className="mb-4 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                <h3 className="font-semibold text-slate-700">{title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${countClass}`}>
                    {list.length}
                </span>
            </div>
            <div className="space-y-3">
                {list.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">暂无任务</p>
                ) : (
                    list.map((t, i) => (
                        <TaskCard
                            key={t.id}
                            task={t}
                            index={i}
                            currentUserId={currentUserId}
                            mode={mode}
                            onClaim={onClaim}
                            onComplete={onComplete}
                            onWorkWithAi={onWorkWithAi}
                            claimingId={claimingId}
                        />
                    ))
                )}
            </div>
        </div>
    )

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Col
                title="Open"
                dotColor="bg-blue-500"
                countClass="bg-blue-100 text-blue-700"
                list={open}
            />
            <Col
                title="In Progress"
                dotColor="bg-amber-500"
                countClass="bg-amber-100 text-amber-700"
                list={inProgress}
            />
            <Col
                title="Completed"
                dotColor="bg-emerald-500"
                countClass="bg-emerald-100 text-emerald-700"
                list={completed}
            />
        </div>
    )
}
