'use client'

import { TaskDetailView } from '@/components/taskai/TaskDetailView'
import { useParams } from 'next/navigation'

export default function AdminTaskaiTaskDetailPage() {
    const params = useParams<{ taskId: string }>()
    const taskId = params?.taskId
    if (!taskId) return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-slate-500">Invalid task</div>
    return <TaskDetailView taskId={taskId} backHref="/admin/taskai/tasks" backText="Back to Task Board" />
}
