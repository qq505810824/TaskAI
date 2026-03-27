'use client'

import { TaskBoardKanban } from '@/components/taskai/TaskBoardKanban'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiTasks } from '@/hooks/useTaskaiTasks'
import type { TaskaiTaskType } from '@/types/taskai'
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

    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createTitle, setCreateTitle] = useState('')
    const [createDesc, setCreateDesc] = useState('')
    const [createPoints, setCreatePoints] = useState('50')
    const [createType, setCreateType] = useState<TaskaiTaskType>('one_time')
    const [createFreq, setCreateFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

    const [createOrgName, setCreateOrgName] = useState('')
    const [creatingOrg, setCreatingOrg] = useState(false)

    const [showEditOrg, setShowEditOrg] = useState(false)
    const [editOrgName, setEditOrgName] = useState('')
    const [editOrgDesc, setEditOrgDesc] = useState('')
    const [savingOrg, setSavingOrg] = useState(false)

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

    useEffect(() => {
        if (currentOrg?.organization) {
            setEditOrgName(currentOrg.organization.name ?? '')
            setEditOrgDesc(currentOrg.organization.description ?? '')
        } else {
            setEditOrgName('')
            setEditOrgDesc('')
        }
    }, [currentOrg?.organization?.name, currentOrg?.organization?.description, orgId])

    const handleSaveOrg = async () => {
        if (!orgId) return
        const name = editOrgName.trim()
        if (!name) return
        setSavingOrg(true)
        try {
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: editOrgDesc.trim() || null,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setShowEditOrg(false)
            await refreshMem()
        } catch (e) {
            alert(e instanceof Error ? e.message : '保存失败')
        } finally {
            setSavingOrg(false)
        }
    }

    const handleCreateOrg = async () => {
        const name = createOrgName.trim()
        if (!name) return
        setCreatingOrg(true)
        try {
            const res = await taskaiFetch('/api/taskai/orgs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            await refreshMem()
            const newId = json.data.organization.id as string
            setOrg(newId)
            setCreateOrgName('')
        } catch (e) {
            alert(e instanceof Error ? e.message : '创建失败')
        } finally {
            setCreatingOrg(false)
        }
    }

    const handleCreateTask = async () => {
        if (!orgId || !createTitle.trim()) return
        setCreating(true)
        try {
            const body: Record<string, unknown> = {
                title: createTitle.trim(),
                description: createDesc.trim() || null,
                points: Number(createPoints),
                type: createType,
            }
            if (createType === 'recurring') body.recurring_frequency = createFreq

            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setShowCreate(false)
            setCreateTitle('')
            setCreateDesc('')
            setCreatePoints('50')
            setCreateType('one_time')
            await refreshTasks()
        } catch (e) {
            alert(e instanceof Error ? e.message : '创建失败')
        } finally {
            setCreating(false)
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
                        {orgId ? `${tasks.length} total tasks` : '请选择或创建组织'}
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
                            onClick={() => setShowEditOrg(true)}
                            disabled={!orgId}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            编辑组织
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreate(true)}
                            disabled={!orgId}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:shadow-indigo-300 disabled:opacity-50"
                        >
                            Create Task
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <input
                            value={createOrgName}
                            onChange={(e) => setCreateOrgName(e.target.value)}
                            placeholder="组织名称"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => void handleCreateOrg()}
                            disabled={creatingOrg}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {creatingOrg ? '创建中…' : '创建组织'}
                        </button>
                    </div>
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
                    onClaim={() => { }}
                    onComplete={() => { }}
                />
            ) : null}

            {showEditOrg && orgId ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-800">编辑组织</h3>
                        <p className="mt-1 text-sm text-slate-500">修改名称与描述（仅 Owner）</p>
                        <div className="mt-4 space-y-3">
                            <input
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="组织名称"
                                value={editOrgName}
                                onChange={(e) => setEditOrgName(e.target.value)}
                            />
                            <textarea
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="描述（可选）"
                                rows={3}
                                value={editOrgDesc}
                                onChange={(e) => setEditOrgDesc(e.target.value)}
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                                onClick={() => setShowEditOrg(false)}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                disabled={savingOrg || !editOrgName.trim()}
                                onClick={() => void handleSaveOrg()}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {savingOrg ? '保存中…' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showCreate ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-800">新建任务</h3>
                        <div className="mt-4 space-y-3">
                            <input
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="标题"
                                value={createTitle}
                                onChange={(e) => setCreateTitle(e.target.value)}
                            />
                            <textarea
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="描述（可选）"
                                rows={3}
                                value={createDesc}
                                onChange={(e) => setCreateDesc(e.target.value)}
                            />
                            <input
                                type="number"
                                min={1}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                value={createPoints}
                                onChange={(e) => setCreatePoints(e.target.value)}
                            />
                            <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                value={createType}
                                onChange={(e) => setCreateType(e.target.value as TaskaiTaskType)}
                            >
                                <option value="one_time">One-time</option>
                                <option value="recurring">Recurring</option>
                            </select>
                            {createType === 'recurring' ? (
                                <select
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    value={createFreq}
                                    onChange={(e) =>
                                        setCreateFreq(e.target.value as 'daily' | 'weekly' | 'monthly')
                                    }
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            ) : null}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                                onClick={() => setShowCreate(false)}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                disabled={creating}
                                onClick={() => void handleCreateTask()}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {creating ? '提交中…' : '创建'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
