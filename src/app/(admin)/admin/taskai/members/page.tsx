'use client'

import { TaskaiOrgModal } from '@/components/taskai/TaskaiOrgModal'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { Copy, Mail, Pencil, Plus, Sparkles, Star, Trash2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'taskai_admin_org_id'

type MemberRow = {
    id: string
    user_id: string
    role: string
    status: string
    joined_at: string
    points_balance: number
    points_earned_total: number
    user: { id: string; name: string | null; email: string | null }
}

type InviteInfo = {
    id: string
    code: string
    status: string
    used_count: number
}

const avatars = ['👨‍💻', '👩‍🔬', '👨‍🎨', '👩‍💼', '👨‍🚀']
const colorSwatches = [
    'bg-gradient-to-br from-indigo-100 to-blue-100',
    'bg-gradient-to-br from-emerald-100 to-teal-100',
    'bg-gradient-to-br from-amber-100 to-orange-100',
    'bg-gradient-to-br from-purple-100 to-pink-100',
]

export default function AdminTaskaiMembersPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: memLoading, refresh: refreshMem } = useTaskaiMemberships()

    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])

    const [orgId, setOrgId] = useState<string | null>(null)
    const [members, setMembers] = useState<MemberRow[]>([])
    const [invite, setInvite] = useState<InviteInfo | null>(null)
    const [listLoading, setListLoading] = useState(false)

    const [emailInput, setEmailInput] = useState('')
    const [adding, setAdding] = useState(false)
    const [creatingInvite, setCreatingInvite] = useState(false)
    const [copyHint, setCopyHint] = useState<string | null>(null)

    const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)
    const [removing, setRemoving] = useState(false)
    const [confirmResetInviteOpen, setConfirmResetInviteOpen] = useState(false)
    const [orgModalOpen, setOrgModalOpen] = useState(false)
    const [orgModalMode, setOrgModalMode] = useState<'create' | 'edit'>('create')

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
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

    useEffect(() => {
        const onOrgChanged = (evt: Event) => {
            const orgIdFromHeader = (evt as CustomEvent<{ orgId?: string }>).detail?.orgId
            if (orgIdFromHeader && ownerMemberships.some((m) => m.org_id === orgIdFromHeader)) {
                setOrg(orgIdFromHeader)
            }
        }
        window.addEventListener('taskai-admin-org-changed', onOrgChanged as EventListener)
        return () => window.removeEventListener('taskai-admin-org-changed', onOrgChanged as EventListener)
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

    const loadLists = useCallback(async () => {
        if (!orgId) {
            setMembers([])
            setInvite(null)
            return
        }
        setListLoading(true)
        try {
            const [mRes, iRes] = await Promise.all([
                taskaiFetch(`/api/taskai/orgs/${orgId}/members`),
                taskaiFetch(`/api/taskai/orgs/${orgId}/invites`),
            ])
            const mJson = await mRes.json()
            const iJson = await iRes.json()
            if (mJson.success) setMembers(mJson.data.members as MemberRow[])
            else setMembers([])
            if (iJson.success) setInvite((iJson.data.invite as InviteInfo | null) ?? null)
            else setInvite(null)
        } finally {
            setListLoading(false)
        }
    }, [orgId, taskaiFetch])

    useEffect(() => {
        void loadLists()
    }, [loadLists])

    const handleAddByEmail = async () => {
        if (!orgId || !emailInput.trim()) return
        setAdding(true)
        try {
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.trim() }),
            })
            const json = await res.json()
            if (!json.success) {
                alert(json.message || 'Add member failed')
                return
            }
            setEmailInput('')
            await loadLists()
            await refreshMem()
        } catch {
            alert('Add member failed')
        } finally {
            setAdding(false)
        }
    }

    const handleResetInviteCode = async () => {
        if (!orgId) return
        setCreatingInvite(true)
        try {
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            const json = await res.json()
            if (!json.success) {
                alert(json.message || 'Generate code failed')
                return
            }
            const code = String(json.data.invite.code)
            setInvite(json.data.invite as InviteInfo)
            await navigator.clipboard.writeText(code)
            setCopyHint('Invite code copied')
            setTimeout(() => setCopyHint(null), 2500)
        } catch {
            alert('Generate code failed')
        } finally {
            setCreatingInvite(false)
        }
    }

    const copyInviteCode = async () => {
        if (!invite?.code) return
        try {
            await navigator.clipboard.writeText(invite.code)
            setCopyHint('Code copied')
            setTimeout(() => setCopyHint(null), 2000)
        } catch {
            alert('Copy failed')
        }
    }

    const confirmRemoveMember = async () => {
        if (!orgId || !removeTarget) return
        setRemoving(true)
        try {
            const res = await taskaiFetch(
                `/api/taskai/orgs/${orgId}/members/${removeTarget.id}`,
                { method: 'DELETE' }
            )
            const json = await res.json()
            if (!json.success) {
                alert(json.message || 'Remove member failed')
                return
            }
            setRemoveTarget(null)
            await loadLists()
            await refreshMem()
        } catch {
            alert('Remove member failed')
        } finally {
            setRemoving(false)
        }
    }

    if (authLoading || !user) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500 sm:px-6 lg:px-8">
                Loading...
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Team Management</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Staff directory and current assignments</p>
                </div>
                {ownerMemberships.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openEditOrgModal()}
                            disabled={!orgId}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Org
                        </button>
                        <button
                            type="button"
                            onClick={() => openCreateOrgModal()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Org
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => openCreateOrgModal()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />
                        Create organization
                    </button>
                )}
            </div>

            {ownerMemberships.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No manageable organization yet. Create one here to start inviting members.
                </p>
            ) : (
                <>
                    <div className="mb-8 grid gap-4 lg:grid-cols-2">
                        <div className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1">
                            <div className="mb-3 flex items-center gap-2 text-slate-700">
                                <Sparkles className="h-4 w-4 text-indigo-500" />
                                <h3 className="font-semibold">Invite Code</h3>
                            </div>
                            <p className="text-sm text-slate-500">Only one active 9-digit code. Regenerate to replace old code.</p>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-lg tracking-widest text-slate-700">
                                    {invite?.code ? invite.code.replace(/(\d{3})(?=\d)/g, '$1 ') : '--- --- ---'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void copyInviteCode()}
                                    disabled={!invite?.code}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                type="button"
                                disabled={!orgId || creatingInvite}
                                onClick={() => setConfirmResetInviteOpen(true)}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                {creatingInvite ? 'Generating...' : invite?.code ? 'Regenerate Code' : 'Generate Code'}
                            </button>
                            {copyHint ? <p className="mt-2 text-sm text-emerald-600">{copyHint}</p> : null}
                        </div>

                        <div className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1">
                            <div className="mb-3 flex items-center gap-2 text-slate-700">
                                <Mail className="h-4 w-4 text-amber-500" />
                                <h3 className="font-semibold">Add by Email</h3>
                            </div>
                            <p className="text-sm text-slate-500">Add existing registered users directly into this organization.</p>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                <input
                                    type="email"
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    placeholder="user@example.com"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                />
                                <button
                                    type="button"
                                    disabled={!orgId || adding || !emailInput.trim()}
                                    onClick={() => void handleAddByEmail()}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                                >
                                    <Users className="h-4 w-4" />
                                    {adding ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {memLoading || listLoading ? (
                        <p className="text-sm text-slate-500">Loading team members...</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {members.map((row, i) => {
                                const currentTaskHint = row.points_balance > 0 ? 'Working on tasks' : 'Available'
                                return (
                                    <div
                                        key={row.id}
                                        className="card-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1"
                                    >
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm ${colorSwatches[i % colorSwatches.length]}`}>
                                                {avatars[i % avatars.length]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="truncate font-bold text-slate-800">{row.user?.name || row.user?.email || 'Anonymous'}</h4>
                                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Star className="h-3 w-3 text-amber-400" />
                                                    {row.points_earned_total} points
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={`rounded-xl border p-3 ${row.points_balance > 0
                                                    ? 'border-amber-200 bg-amber-50'
                                                    : 'border-slate-200 bg-slate-50'
                                                }`}
                                        >
                                            {row.points_balance > 0 ? (
                                                <>
                                                    <div className="mb-1 flex items-center gap-2 text-amber-700">
                                                        <span className="text-xs font-semibold uppercase tracking-wide">Working On</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-800">{currentTaskHint}</p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{row.points_balance} pts balance · {row.role}</p>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <span className="text-sm font-medium">Available</span>
                                                </div>
                                            )}
                                        </div>

                                        {row.role !== 'owner' ? (
                                            <button
                                                type="button"
                                                onClick={() => setRemoveTarget(row)}
                                                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Remove Member
                                            </button>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
            <TaskaiOrgModal
                open={orgModalOpen}
                mode={orgModalMode}
                orgId={orgId}
                initialName={currentOrg?.organization?.name ?? ''}
                initialDescription={currentOrg?.organization?.description ?? ''}
                onClose={() => setOrgModalOpen(false)}
                onAfterSave={async () => {
                    await refreshMem()
                    await loadLists()
                }}
                onCreatedOrg={(id) => setOrg(id)}
                taskaiFetch={taskaiFetch}
            />

            {removeTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800">Confirm removal</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Remove <span className="font-semibold text-slate-700">{removeTarget.user?.name || removeTarget.user?.email}</span> from this organization?
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRemoveTarget(null)}
                                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={removing}
                                onClick={() => void confirmRemoveMember()}
                                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {removing ? 'Removing...' : 'Confirm Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {confirmResetInviteOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800">Regenerate invite code?</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            This will invalidate the current code immediately. Existing shared code will stop working.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmResetInviteOpen(false)}
                                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={creatingInvite}
                                onClick={async () => {
                                    setConfirmResetInviteOpen(false)
                                    await handleResetInviteCode()
                                }}
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {creatingInvite ? 'Generating...' : 'Confirm Regenerate'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
