'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useTaskaiSelectedOrg } from '@/hooks/taskai/useTaskaiSelectedOrg'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { formatTaskaiDateTime } from '@/lib/taskai/date-format'
import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'
import { BellRing, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type AdminNotificationRow = {
    id: string
    event_type: string
    status: string
    rendered_message: string | null
    error_message: string | null
    created_at: string
    scheduled_for: string
    sent_at: string | null
    failed_at: string | null
    payload: Record<string, unknown>
    user: { id: string; name: string | null; email: string | null } | null
    task: { id: string; title: string } | null
}

export default function AdminTaskaiNotificationsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: membershipsLoading } = useTaskaiMemberships()
    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])
    const { orgId } = useTaskaiSelectedOrg(ownerMemberships, 'admin')
    const [rows, setRows] = useState<AdminNotificationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, router, user])

    useEffect(() => {
        if (!orgId || !user) {
            setRows([])
            setLoading(false)
            return
        }
        let cancelled = false
        const run = async () => {
            try {
                setLoading(true)
                setError(null)
                const res = await taskaiFetch(`/api/taskai/admin/notifications?orgId=${encodeURIComponent(orgId)}`)
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Failed to load notifications')
                if (!cancelled) setRows((json.data.jobs ?? []) as AdminNotificationRow[])
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Unknown error')
                    setRows([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [orgId, taskaiFetch, user])

    const currentOrg = ownerMemberships.find((m) => m.org_id === orgId)

    if (authLoading || membershipsLoading || (ownerMemberships.length > 0 && !orgId)) {
        return (
            <TaskaiPageLoader
                title="Loading Notification Log..."
                description="Waiting for your admin organization and notification data before rendering this page."
            />
        )
    }

    if (!user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">Loading...</div>
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">WhatsApp Notifications</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Queue, delivery status, and failure reasons for outbound WhatsApp messages
                    </p>
                    {currentOrg ? (
                        <p className="mt-1 text-xs text-slate-400">
                            Viewing admin notifications for <strong>{currentOrg.organization?.name ?? currentOrg.org_id}</strong>
                        </p>
                    ) : null}
                </div>
            </div>

            {!orgId ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No manageable organization yet.
                </p>
            ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading notification log...
                </div>
            ) : error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                            <BellRing className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-800">Delivery Log</h3>
                            <p className="text-sm text-slate-500">{rows.length} records</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Time</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">User</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Task</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Event</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Message</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Error</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => (
                                    <tr key={row.id} className="align-top">
                                        <td className="px-4 py-3 text-slate-600">
                                            {formatTaskaiDateTime(row.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {row.user?.name || row.user?.email || row.user?.id || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{row.task?.title || '-'}</td>
                                        <td className="px-4 py-3 text-slate-700">{row.event_type}</td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {String(row.payload?.normalized_phone_number ?? row.payload?.phone_number ?? '-')}
                                        </td>
                                        <td className="max-w-md px-4 py-3 text-slate-600">
                                            <div className="whitespace-pre-wrap">{row.rendered_message || '-'}</div>
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-red-600">{row.error_message || '-'}</td>
                                    </tr>
                                ))}
                                {!rows.length ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                                            No notification records yet for this admin organization. This page only shows organizations where you are an owner.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
