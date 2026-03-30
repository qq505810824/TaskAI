'use client'

import { TaskBoardDatabaseView } from '@/components/taskai/TaskBoardDatabaseView'
import { TaskCompleteCelebration } from '@/components/taskai/TaskCompleteCelebration'
import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiSelectedOrg } from '@/hooks/taskai/useTaskaiSelectedOrg'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiTasks } from '@/hooks/useTaskaiTasks'
import type { TaskaiTaskRow } from '@/types/taskai'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

/** 成员端：仅开放任务池 + 本人进行中/已完成，不展示他人负责的任务 */
function filterMemberVisibleTasks(tasks: TaskaiTaskRow[], userId: string) {
    return tasks.filter((t) => {
        if (t.status === 'open') return true
        if (t.assignee_user_id === userId && (t.status === 'in_progress' || t.status === 'completed')) {
            return true
        }
        return false
    })
}

export default function MemberTaskaiTasksPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: memLoading, refresh: refreshMem } = useTaskaiMemberships()

    const { orgId } = useTaskaiSelectedOrg(memberships, 'member')
    const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTaskaiTasks(orgId)
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [celebratePoints, setCelebratePoints] = useState<number | null>(null)

    const visibleTasks = useMemo(
        () => (user?.id ? filterMemberVisibleTasks(tasks, user.id) : []),
        [tasks, user?.id]
    )

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, user, router])

    const currentMembership = useMemo(() => memberships.find((m) => m.org_id === orgId), [memberships, orgId])
    const isOwnerHere = currentMembership?.role === 'owner'
    const currentUserId = user?.id
    const waitingForInitialTaskaiState = authLoading || memLoading || (memberships.length > 0 && !orgId)

    const refreshAfterMutation = useCallback(async () => {
        await Promise.all([refreshTasks(), refreshMem()])
    }, [refreshTasks, refreshMem])

    const onClaim = useCallback(async (taskId: string) => {
        setClaimingId(taskId)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/claim`, { method: 'POST' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Claim failed')
            await refreshAfterMutation()
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Claim failed')
        } finally {
            setClaimingId(null)
        }
    }, [refreshAfterMutation, taskaiFetch])

    const onComplete = useCallback(async (task: TaskaiTaskRow) => {
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${task.id}/complete`, { method: 'POST' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Complete failed')
            setCelebratePoints(task.points)
            setTimeout(() => setCelebratePoints(null), 1300)
            await refreshAfterMutation()
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Complete failed')
        }
    }, [refreshAfterMutation, taskaiFetch])

    const onWorkWithAi = useCallback((_task: TaskaiTaskRow) => {
        const qs = new URLSearchParams({
            taskId: _task.id,
            title: _task.title,
            points: String(_task.points),
            orgId: _task.org_id,
            description: _task.description ?? '',
        })
        router.push(`/taskai/workspace?${qs.toString()}`)
    }, [router])

    const onViewTaskDetail = useCallback((_task: TaskaiTaskRow) => {
        router.push(`/taskai/tasks/${_task.id}`)
    }, [router])

    const board = useMemo(() => {
        if (memberships.length === 0) return null
        if (memLoading || tasksLoading) return <p className="text-slate-500">Loading tasks...</p>
        if (!orgId) return null
        return (
            <TaskBoardDatabaseView
                tasks={visibleTasks}
                mode="member"
                defaultViewMode="board"
                currentUserId={currentUserId}
                onClaim={onClaim}
                onComplete={onComplete}
                onWorkWithAi={onWorkWithAi}
                claimingTaskId={claimingId}
                onViewTaskDetail={onViewTaskDetail}
            />
        )
    }, [
        memberships.length,
        memLoading,
        tasksLoading,
        orgId,
        visibleTasks,
        currentUserId,
        onClaim,
        onComplete,
        onWorkWithAi,
        claimingId,
        onViewTaskDetail,
    ])

    if (waitingForInitialTaskaiState) {
        return (
            <TaskaiPageLoader
                title="Loading Task Board..."
                description="Waiting for your membership and task data before rendering the board."
            />
        )
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500 sm:px-6 lg:px-8">
                Loading...
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <TaskCompleteCelebration
                open={celebratePoints != null}
                points={celebratePoints ?? 0}
                message="Great work. Keep the momentum going."
            />
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Task Board</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Logged in as <strong>{user.username}</strong>
                        {currentMembership != null
                            ? ` · ${currentMembership.points_earned_total ?? 0} pts`
                            : null}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {memberships.length === 0 ? (
                        <p className="text-sm text-amber-700">
                            You have no available organizations. Please join through the invitation code or have the administrator add you.
                        </p>
                    ) : null}
                </div>
            </div>

            {board ? <section>{board}</section> : null}
        </div>
    )
}
