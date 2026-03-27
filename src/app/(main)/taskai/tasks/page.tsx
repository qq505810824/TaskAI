'use client'

import { TaskBoardKanban } from '@/components/taskai/TaskBoardKanban'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiTasks } from '@/hooks/useTaskaiTasks'
import type { TaskaiTaskRow } from '@/types/taskai'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'taskai_member_org_id'

export default function MemberTaskaiTasksPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: memLoading, refresh: refreshMem } = useTaskaiMemberships()

    const memberMemberships = useMemo(() => memberships.filter((m) => m.role === 'member'), [memberships])

    const [orgId, setOrgId] = useState<string | null>(null)
    const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTaskaiTasks(orgId)
    const [claimingId, setClaimingId] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, user, router])

    useEffect(() => {
        if (!memberMemberships.length) {
            setOrgId(null)
            return
        }
        let initial: string | null = null
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored && memberMemberships.some((m) => m.org_id === stored)) {
                initial = stored
            }
        } catch {
            /* */
        }
        if (!initial) initial = memberMemberships[0].org_id
        setOrgId(initial)
    }, [memberMemberships])

    const setOrg = (id: string) => {
        setOrgId(id)
        try {
            localStorage.setItem(STORAGE_KEY, id)
        } catch {
            /* */
        }
    }

    const onClaim = async (taskId: string) => {
        setClaimingId(taskId)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/claim`, { method: 'POST' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || '认领失败')
            await refreshTasks()
            await refreshMem()
        } catch (e) {
            alert(e instanceof Error ? e.message : '认领失败')
        } finally {
            setClaimingId(null)
        }
    }

    const onComplete = async (task: TaskaiTaskRow) => {
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${task.id}/complete`, { method: 'POST' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || '完成失败')
            await refreshTasks()
            await refreshMem()
        } catch (e) {
            alert(e instanceof Error ? e.message : '完成失败')
        }
    }

    const onWorkWithAi = (_task: TaskaiTaskRow) => {
        router.push('/home')
    }

    if (authLoading || !user) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500 sm:px-6 lg:px-8">
                加载中…
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Task Board</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Logged in as <strong>{user.username}</strong>
                        {memberMemberships.find((m) => m.org_id === orgId) != null
                            ? ` · ${memberMemberships.find((m) => m.org_id === orgId)?.points_earned_total ?? 0} pts`
                            : null}
                    </p>
                </div>
                {memberMemberships.length > 0 ? (
                    <select
                        value={orgId ?? ''}
                        onChange={(e) => setOrg(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                        {memberMemberships.map((m) => (
                            <option key={m.id} value={m.org_id}>
                                {m.organization?.name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <p className="text-sm text-amber-700">
                        您尚无可用的成员组织，请通过邀请链接加入或由管理员添加。
                    </p>
                )}
            </div>

            {memLoading || tasksLoading ? (
                <p className="text-slate-500">加载任务…</p>
            ) : orgId ? (
                <TaskBoardKanban
                    tasks={tasks}
                    mode="member"
                    currentUserId={user.id}
                    onClaim={onClaim}
                    onComplete={onComplete}
                    onWorkWithAi={onWorkWithAi}
                    claimingId={claimingId}
                />
            ) : null}
        </div>
    )
}
