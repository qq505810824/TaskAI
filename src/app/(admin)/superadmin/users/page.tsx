'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ChevronDown, Loader2, RefreshCcw, ShieldUser, Trash2, Undo2, UsersRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type UserOrganization = {
    org_id: string
    org_name: string | null
    role: string
    status: string
}

type SuperadminUserRow = {
    id: string
    name: string | null
    email: string | null
    role: 'admin' | 'user'
    avatar_url: string | null
    created_at: string
    updated_at: string
    last_sign_in_at: string | null
    is_active: boolean
    deactivated_at: string | null
    organizations: UserOrganization[]
}

type OrganizationOption = {
    id: string
    name: string
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return '—'
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

export default function SuperadminUsersPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [users, setUsers] = useState<SuperadminUserRow[]>([])
    const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [savingUserId, setSavingUserId] = useState<string | null>(null)
    const [passwordEditorUserId, setPasswordEditorUserId] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [showRemovedUsers, setShowRemovedUsers] = useState(false)

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        setNotice(null)

        try {
            const {
                data: { session }
            } = await supabase.auth.getSession()

            const token = session?.access_token ?? user?.token
            if (!token) {
                throw new Error('Missing access token')
            }

            const query = selectedOrgId ? `?orgId=${encodeURIComponent(selectedOrgId)}` : ''
            const res = await fetch(`/api/superadmin/users${query}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to load users')
            }

            setUsers(json.data?.users ?? [])
            setOrganizations(json.data?.organizations ?? [])
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load users')
        } finally {
            setIsLoading(false)
        }
    }, [selectedOrgId, user?.token])

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login')
        }
    }, [authLoading, user, router])

    useEffect(() => {
        if (!authLoading && user) {
            void fetchUsers()
        }
    }, [authLoading, user, fetchUsers])

    const visibleUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase()
        const filtered = keyword
            ? users.filter((entry) => {
                  const name = entry.name?.toLowerCase() ?? ''
                  const email = entry.email?.toLowerCase() ?? ''
                  return name.includes(keyword) || email.includes(keyword)
              })
            : users

        return {
            active: filtered.filter((entry) => entry.is_active),
            removed: filtered.filter((entry) => !entry.is_active),
        }
    }, [search, users])

    const updateRole = async (userId: string, role: 'admin' | 'user') => {
        setSavingUserId(userId)
        setError(null)
        setNotice(null)

        try {
            const {
                data: { session }
            } = await supabase.auth.getSession()

            const token = session?.access_token ?? user?.token
            if (!token) {
                throw new Error('Missing access token')
            }

            const res = await fetch(`/api/superadmin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ role })
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to update role')
            }

            setUsers((prev) =>
                prev.map((entry) => (entry.id === userId ? { ...entry, role: json.data.role, updated_at: json.data.updated_at } : entry))
            )
            setNotice('User role updated.')
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Failed to update role')
        } finally {
            setSavingUserId(null)
        }
    }

    const updatePassword = async (userId: string) => {
        setSavingUserId(userId)
        setError(null)
        setNotice(null)

        try {
            const {
                data: { session }
            } = await supabase.auth.getSession()

            const token = session?.access_token ?? user?.token
            if (!token) {
                throw new Error('Missing access token')
            }

            const res = await fetch(`/api/superadmin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ password: newPassword })
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to update password')
            }

            setNotice('Password updated successfully.')
            setPasswordEditorUserId(null)
            setNewPassword('')
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Failed to update password')
        } finally {
            setSavingUserId(null)
        }
    }

    const updateActiveState = async (userId: string, isActive: boolean) => {
        setSavingUserId(userId)
        setError(null)
        setNotice(null)

        try {
            const {
                data: { session }
            } = await supabase.auth.getSession()

            const token = session?.access_token ?? user?.token
            if (!token) {
                throw new Error('Missing access token')
            }

            const res = await fetch(`/api/superadmin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isActive })
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to update user access')
            }

            setUsers((prev) =>
                prev.map((entry) =>
                    entry.id === userId
                        ? {
                              ...entry,
                              is_active: isActive,
                              deactivated_at: isActive ? null : json.data.meta?.superadmin?.deactivated_at ?? new Date().toISOString(),
                              updated_at: json.data.updated_at,
                          }
                        : entry
                )
            )
            setNotice(isActive ? 'User access restored.' : 'User removed from the active list.')
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Failed to update user access')
        } finally {
            setSavingUserId(null)
        }
    }

    if (authLoading || (!user && !error)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                                    <UsersRound className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold text-slate-900">Superadmin User Console</h1>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Hidden user management page for the superadmin only.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:w-72"
                            />
                            <select
                                value={selectedOrgId}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:w-64"
                            >
                                <option value="">All organizations</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => void fetchUsers()}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                <RefreshCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {notice ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {notice}
                        </div>
                    ) : null}

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-5 py-4">User</th>
                                        <th className="px-5 py-4">Organizations</th>
                                        <th className="px-5 py-4">Email</th>
                                        <th className="px-5 py-4">Role</th>
                                        <th className="px-5 py-4">Last Sign In</th>
                                        <th className="px-5 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                                                <div className="inline-flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading users...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : visibleUsers.active.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                                                No active users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleUsers.active.flatMap((entry) => {
                                            const rows = [
                                                <tr key={entry.id} className="align-top">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {entry.avatar_url ? (
                                                                <img
                                                                    src={entry.avatar_url}
                                                                    alt={entry.name ?? entry.email ?? 'User avatar'}
                                                                    width={40}
                                                                    height={40}
                                                                    className="h-10 w-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                                    <ShieldUser className="h-4 w-4" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium text-slate-900">{entry.name || 'Unnamed user'}</p>
                                                                <p className="mt-1 text-xs text-slate-400">{entry.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {entry.organizations.length ? (
                                                                entry.organizations.map((org) => (
                                                                    <span
                                                                        key={`${entry.id}-${org.org_id}`}
                                                                        className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                                                                    >
                                                                        {org.org_name || 'Unnamed org'}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-sm text-slate-400">No organizations</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-slate-600">{entry.email || '—'}</td>
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize',
                                                                entry.role === 'admin'
                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                    : 'bg-slate-100 text-slate-700'
                                                            )}
                                                        >
                                                            {entry.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-slate-600">
                                                        {formatDateTime(entry.last_sign_in_at)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void updateRole(entry.id, 'user')}
                                                                disabled={savingUserId === entry.id || entry.role === 'user'}
                                                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                                            >
                                                                Make user
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void updateRole(entry.id, 'admin')}
                                                                disabled={savingUserId === entry.id || entry.role === 'admin'}
                                                                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                                            >
                                                                {savingUserId === entry.id ? 'Saving...' : 'Make admin'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPasswordEditorUserId((current) => (current === entry.id ? null : entry.id))
                                                                    setNewPassword('')
                                                                    setError(null)
                                                                    setNotice(null)
                                                                }}
                                                                className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                                                            >
                                                                Set password
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void updateActiveState(entry.id, false)}
                                                                disabled={savingUserId === entry.id}
                                                                className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>,
                                            ]

                                            if (passwordEditorUserId === entry.id) {
                                                rows.push(
                                                    <tr key={`${entry.id}-password`}>
                                                        <td colSpan={6} className="bg-slate-50 px-5 py-4">
                                                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-slate-900">
                                                                        Set a new password for {entry.name || entry.email || 'this user'}
                                                                    </p>
                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        This changes the login password immediately. Minimum 8 characters.
                                                                    </p>
                                                                </div>
                                                                <input
                                                                    type="password"
                                                                    value={newPassword}
                                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                                    placeholder="Enter new password"
                                                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:w-72"
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void updatePassword(entry.id)}
                                                                        disabled={savingUserId === entry.id || newPassword.trim().length < 8}
                                                                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                                                    >
                                                                        {savingUserId === entry.id ? 'Saving...' : 'Save password'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPasswordEditorUserId(null)
                                                                            setNewPassword('')
                                                                        }}
                                                                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            }

                                            return rows
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50">
                        <button
                            type="button"
                            onClick={() => setShowRemovedUsers((current) => !current)}
                            className="flex w-full items-center justify-between px-5 py-4 text-left"
                        >
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Removed users</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Hidden by default. Restore access here when needed.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                    {visibleUsers.removed.length}
                                </span>
                                <ChevronDown className={cn('h-4 w-4 text-slate-500 transition', showRemovedUsers && 'rotate-180')} />
                            </div>
                        </button>

                        {showRemovedUsers ? (
                            <div className="border-t border-slate-200 bg-white px-5 py-4">
                                {visibleUsers.removed.length === 0 ? (
                                    <p className="text-sm text-slate-500">No removed users.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {visibleUsers.removed.map((entry) => (
                                            <div
                                                key={`${entry.id}-removed`}
                                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900">{entry.name || entry.email || 'Unnamed user'}</p>
                                                    <p className="mt-1 text-sm text-slate-500">{entry.email || '—'}</p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Removed {formatDateTime(entry.deactivated_at)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void updateActiveState(entry.id, true)}
                                                    disabled={savingUserId === entry.id}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                                >
                                                    <Undo2 className="h-4 w-4" />
                                                    Restore access
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
