'use client'

import { AddByEmailCard } from '@/components/taskai/members/AddByEmailCard'
import { InviteCodeCard } from '@/components/taskai/members/InviteCodeCard'
import { RegenerateInviteModal, RemoveMemberModal } from '@/components/taskai/members/MemberActionModals'
import { TeamMemberCard } from '@/components/taskai/members/TeamMemberCard'
import { TaskaiOrgModal } from '@/components/taskai/TaskaiOrgModal'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { Pencil, Plus } from 'lucide-react'
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
    user: { id: string; name: string | null; email: string | null; avatar_url?: string | null }
}

type InviteInfo = {
    id: string
    code: string
    status: string
    used_count: number
}

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
                        <InviteCodeCard
                            code={invite?.code}
                            creating={creatingInvite || !orgId}
                            copyHint={copyHint}
                            onCopy={() => void copyInviteCode()}
                            onRegenerate={() => setConfirmResetInviteOpen(true)}
                        />
                        <AddByEmailCard
                            email={emailInput}
                            adding={adding}
                            disabled={!orgId || adding || !emailInput.trim()}
                            onEmailChange={setEmailInput}
                            onAdd={() => void handleAddByEmail()}
                        />
                    </div>

                    {memLoading || listLoading ? (
                        <p className="text-sm text-slate-500">Loading team members...</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {members.map((row, i) => {
                                return (
                                    <TeamMemberCard
                                        key={row.id}
                                        row={row}
                                        index={i}
                                        onRemove={setRemoveTarget}
                                    />
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

            <RemoveMemberModal
                target={removeTarget}
                removing={removing}
                onClose={() => setRemoveTarget(null)}
                onConfirm={() => void confirmRemoveMember()}
            />
            <RegenerateInviteModal
                open={confirmResetInviteOpen}
                creating={creatingInvite}
                onClose={() => setConfirmResetInviteOpen(false)}
                onConfirm={() => {
                    setConfirmResetInviteOpen(false)
                    void handleResetInviteCode()
                }}
            />
        </div>
    )
}
