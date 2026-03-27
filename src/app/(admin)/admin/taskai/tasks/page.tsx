'use client'

import { TaskBoardKanban } from '@/components/taskai/TaskBoardKanban'
import { TaskaiOrgModal } from '@/components/taskai/TaskaiOrgModal'
import { TaskaiTaskFormModal, type TaskaiTaskFormPayload } from '@/components/taskai/TaskaiTaskFormModal'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiTasks } from '@/hooks/useTaskaiTasks'
import type { TaskaiTaskRow } from '@/types/taskai'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'taskai_admin_org_id'

export default function AdminTaskaiTasksPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: memLoading, refresh: refreshMem } = useTaskaiMemberships()

    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])

    const [orgId, setOrgId] = useState<string | null>(null)
    const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTaskaiTasks(orgId)

    const [orgModalOpen, setOrgModalOpen] = useState(false)
    const [orgModalMode, setOrgModalMode] = useState<'create' | 'edit'>('create')

    const [taskModalOpen, setTaskModalOpen] = useState(false)
    const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create')
    const [taskEditing, setTaskEditing] = useState<TaskaiTaskRow | null>(null)
    const [taskSubmitting, setTaskSubmitting] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<TaskaiTaskRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.replace('/login')
        }
    }, [authLoading, user, router])

    useEffect(() => {
        if (!ownerMemberships.length) {
            setOrgId(null)
            return
        }
        let initial: string | null = null
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored && ownerMemberships.some((m) => m.org_id === stored)) {
                initial = stored
            }
        } catch {
            /* */
        }
        if (!initial) initial = ownerMemberships[0].org_id
        setOrgId(initial)
    }, [ownerMemberships])

    const setOrg = (id: string) => {
        setOrgId(id)
        try {
            localStorage.setItem(STORAGE_KEY, id)
        } catch {
            /* */
        }
    }

    const currentOrg = ownerMemberships.find((m) => m.org_id === orgId)

    const openCreateOrgModal = () => {
        setOrgModalMode('create')
        setOrgModalOpen(true)
    }

    const openEditOrgModal = () => {
        setOrgModalMode('edit')
        setOrgModalOpen(true)
    }

    const openCreateTaskModal = () => {
        setTaskModalMode('create')
        setTaskEditing(null)
        setTaskModalOpen(true)
    }

    const openEditTaskModal = (t: TaskaiTaskRow) => {
        setTaskModalMode('edit')
        setTaskEditing(t)
        setTaskModalOpen(true)
    }

    const handleTaskSubmit = async (payload: TaskaiTaskFormPayload) => {
        if (taskModalMode === 'create') {
            if (!orgId) return
            setTaskSubmitting(true)
            try {
                const body: Record<string, unknown> = {
                    title: payload.title,
                    description: payload.description,
                    points: payload.points,
                    type: payload.type,
                    category: payload.category,
                }
                if (payload.type === 'recurring') body.recurring_frequency = payload.recurring_frequency

                const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Create failed')
                setTaskModalOpen(false)
                await refreshTasks()
            } catch (e) {
                alert(e instanceof Error ? e.message : 'Create failed')
            } finally {
                setTaskSubmitting(false)
            }
            return
        }

        if (!taskEditing) return
        setTaskSubmitting(true)
        try {
            const body: Record<string, unknown> = {
                title: payload.title,
                description: payload.description,
                points: payload.points,
                type: payload.type,
                category: payload.category,
                recurring_frequency: payload.type === 'recurring' ? payload.recurring_frequency : null,
            }
            const res = await taskaiFetch(`/api/taskai/tasks/${taskEditing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Update failed')
            setTaskModalOpen(false)
            setTaskEditing(null)
            await refreshTasks()
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Update failed')
        } finally {
            setTaskSubmitting(false)
        }
    }

    const confirmDeleteTask = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${deleteTarget.id}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Delete failed')
            setDeleteTarget(null)
            await refreshTasks()
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Delete failed')
        } finally {
            setDeleting(false)
        }
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
                        {orgId ? `${tasks.length} total tasks` : '创建或选择组织以管理任务'}
                    </p>
                </div>
                {ownerMemberships.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={orgId ?? ''}
                            onChange={(e) => setOrg(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                        >
                            {ownerMemberships.map((m) => (
                                <option key={m.id} value={m.org_id}>
                                    {m.organization?.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => openEditOrgModal()}
                            disabled={!orgId}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            编辑组织
                        </button>
                        <button
                            type="button"
                            onClick={() => openCreateTaskModal()}
                            disabled={!orgId}
                            className="flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:shadow-indigo-300 disabled:opacity-50"
                        >
                            Create Task
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => openCreateOrgModal()}
                        className="rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:shadow-indigo-300"
                    >
                        Create organization
                    </button>
                )}
            </div>

            {currentOrg?.organization?.points_pool_remaining != null && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                    Org Pool: {currentOrg.organization.points_pool_remaining?.toLocaleString() ?? '—'}
                </div>
            )}

            {memLoading || tasksLoading ? (
                <p className="text-slate-500">加载任务…</p>
            ) : orgId ? (
                <TaskBoardKanban
                    tasks={tasks}
                    mode="owner"
                    currentUserId={user.id}
                    onClaim={() => {}}
                    onComplete={() => {}}
                    onOwnerEditTask={openEditTaskModal}
                    onOwnerDeleteTask={(t) => setDeleteTarget(t)}
                />
            ) : null}

            <TaskaiOrgModal
                open={orgModalOpen}
                mode={orgModalMode}
                orgId={orgId}
                initialName={currentOrg?.organization?.name ?? ''}
                initialDescription={currentOrg?.organization?.description ?? ''}
                onClose={() => setOrgModalOpen(false)}
                onAfterSave={async () => {
                    await refreshMem()
                }}
                onCreatedOrg={(id) => setOrg(id)}
                taskaiFetch={taskaiFetch}
            />

            <TaskaiTaskFormModal
                open={taskModalOpen}
                mode={taskModalMode}
                initialTask={taskEditing}
                submitting={taskSubmitting}
                onClose={() => {
                    setTaskModalOpen(false)
                    setTaskEditing(null)
                }}
                onSubmit={(p) => void handleTaskSubmit(p)}
            />

            {deleteTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800">Delete task?</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            This will remove{' '}
                            <span className="font-semibold text-slate-800">{deleteTarget.title}</span> permanently.
                            Only open tasks can be deleted.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => void confirmDeleteTask()}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
