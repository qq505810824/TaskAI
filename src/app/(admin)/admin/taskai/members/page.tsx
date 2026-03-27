'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
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

type InviteRow = {
    id: string
    code: string
    status: string
    expires_at: string | null
    max_uses: number | null
    used_count: number
    created_at: string
    invite_url: string
}

export default function AdminTaskaiMembersPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: memLoading, refresh: refreshMem } = useTaskaiMemberships()

    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])

    const [orgId, setOrgId] = useState<string | null>(null)
    const [members, setMembers] = useState<MemberRow[]>([])
    const [invites, setInvites] = useState<InviteRow[]>([])
    const [listLoading, setListLoading] = useState(false)

    const [emailInput, setEmailInput] = useState('')
    const [adding, setAdding] = useState(false)
    const [creatingInvite, setCreatingInvite] = useState(false)
    const [copyHint, setCopyHint] = useState<string | null>(null)

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

    const setOrg = (id: string) => {
        setOrgId(id)
        try {
            localStorage.setItem(STORAGE_KEY, id)
        } catch {
            /* */
        }
    }

    const loadLists = useCallback(async () => {
        if (!orgId) {
            setMembers([])
            setInvites([])
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
            if (iJson.success) setInvites(iJson.data.invites as InviteRow[])
            else setInvites([])
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
                alert(json.message || '添加失败')
                return
            }
            setEmailInput('')
            await loadLists()
            await refreshMem()
        } catch {
            alert('添加失败')
        } finally {
            setAdding(false)
        }
    }

    const handleCreateInvite = async () => {
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
                alert(json.message || '创建邀请失败')
                return
            }
            const url = json.data.invite.invite_url as string
            await loadLists()
            await navigator.clipboard.writeText(url)
            setCopyHint('已复制最新邀请链接到剪贴板')
            setTimeout(() => setCopyHint(null), 3500)
        } catch {
            alert('创建或复制失败')
        } finally {
            setCreatingInvite(false)
        }
    }

    const copyUrl = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url)
            setCopyHint('已复制')
            setTimeout(() => setCopyHint(null), 2000)
        } catch {
            alert('复制失败，请手动选择链接')
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
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">成员与邀请</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        复制邀请链接给同事注册后加入；或直接输入已注册用户的邮箱。
                    </p>
                </div>
                {ownerMemberships.length > 0 ? (
                    <select
                        value={orgId ?? ''}
                        onChange={(e) => setOrg(e.target.value)}
                        className="max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                        {ownerMemberships.map((m) => (
                            <option key={m.id} value={m.org_id}>
                                {m.organization?.name}
                            </option>
                        ))}
                    </select>
                ) : null}
            </div>

            {ownerMemberships.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    您还未拥有可管理的组织。请先在「任务」页创建组织。
                </p>
            ) : (
                <>
                    <div className="mb-10 grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800">邀请链接</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                生成新链接并自动复制。对方需登录后打开链接或在本页「加入组织」输入码。
                            </p>
                            <button
                                type="button"
                                disabled={!orgId || creatingInvite}
                                onClick={() => void handleCreateInvite()}
                                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {creatingInvite ? '生成中…' : '生成并复制邀请链接'}
                            </button>
                            {copyHint ? (
                                <p className="mt-2 text-sm text-emerald-600">{copyHint}</p>
                            ) : null}
                            <ul className="mt-6 space-y-3">
                                {invites.slice(0, 5).map((inv) => (
                                    <li
                                        key={inv.id}
                                        className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0 font-mono text-xs text-slate-600">
                                            <div className="truncate" title={inv.invite_url}>
                                                {inv.invite_url}
                                            </div>
                                            <div className="mt-1 text-slate-400">
                                                已用 {inv.used_count}
                                                {inv.max_uses != null ? ` / ${inv.max_uses}` : ''} · {inv.status}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void copyUrl(inv.invite_url)}
                                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-slate-50"
                                        >
                                            复制
                                        </button>
                                    </li>
                                ))}
                                {invites.length === 0 ? (
                                    <li className="text-sm text-slate-400">暂无历史邀请，点击上方生成。</li>
                                ) : null}
                            </ul>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-800">通过邮箱添加</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                仅支持已在平台注册的用户（<code className="rounded bg-slate-100 px-1">users</code> 表中有该邮箱）。
                            </p>
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
                                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                                >
                                    {adding ? '加入中…' : '添加成员'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800">成员列表</h2>
                        {memLoading || listLoading ? (
                            <p className="mt-4 text-sm text-slate-500">加载中…</p>
                        ) : (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full min-w-[480px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="pb-2 font-medium">用户</th>
                                            <th className="pb-2 font-medium">邮箱</th>
                                            <th className="pb-2 font-medium">角色</th>
                                            <th className="pb-2 font-medium">积分</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map((row) => (
                                            <tr key={row.id} className="border-b border-slate-100">
                                                <td className="py-3 text-slate-800">
                                                    {row.user?.name || '—'}
                                                </td>
                                                <td className="py-3 text-slate-600">{row.user?.email || '—'}</td>
                                                <td className="py-3">
                                                    <span
                                                        className={
                                                            row.role === 'owner'
                                                                ? 'rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800'
                                                                : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'
                                                        }
                                                    >
                                                        {row.role === 'owner' ? 'Owner' : 'Member'}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-slate-600">{row.points_balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {members.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-slate-400">暂无成员</p>
                                ) : null}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
