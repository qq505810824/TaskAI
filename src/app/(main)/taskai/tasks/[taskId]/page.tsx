'use client'

import { TaskDetailView } from '@/components/taskai/TaskDetailView'
import { useParams } from 'next/navigation'

export default function TaskaiTaskDetailPage() {
    const params = useParams<{ taskId: string }>()
    const taskId = params?.taskId
    if (!taskId) return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-slate-500">无效任务</div>
    return <TaskDetailView taskId={taskId} backHref="/taskai/tasks" />
}
