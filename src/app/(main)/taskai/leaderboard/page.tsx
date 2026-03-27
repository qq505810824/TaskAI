'use client'

import { useTaskaiLeaderboard } from '@/hooks/taskai/useTaskaiLeaderboard'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'taskai_member_org_id'
const medalBgs = [
    'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
    'bg-gradient-to-r from-slate-50 to-gray-100 border-slate-300',
    'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200',
]
const medals = ['🥇', '🥈', '🥉']
const avatars = ['👨‍💻', '👩‍🔬', '👨‍🎨', '👩‍💼', '👨‍🚀']

export default function TaskaiLeaderboardPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { memberships } = useTaskaiMemberships()
    const ownerMemberships = useMemo(() => memberships.filter((m) => (m.role === 'member' || m.role === 'owner')), [memberships])
    const [orgId, setOrgId] = useState<string | null>(null)
    const { rows: leaderboard, loading } = useTaskaiLeaderboard(orgId)

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
            if (stored && ownerMemberships.some((m) => m.org_id === stored)) initial = stored
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
                setOrgId(orgIdFromHeader)
            }
        }
        window.addEventListener('taskai-member-org-changed', onOrgChanged as EventListener)
        return () => window.removeEventListener('taskai-member-org-changed', onOrgChanged as EventListener)
    }, [ownerMemberships])

    if (authLoading || !user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">Loading...</div>
    }

    const top1 = leaderboard[0]
    const top2 = leaderboard[1]
    const top3 = leaderboard[2]

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Leaderboard</h1>
                    <p className="text-sm text-slate-500">Top performers in the organization</p>
                </div>
            </div>

            {!orgId ? (
                <p className="text-sm text-amber-700">No manageable organization yet. Create one in Task Board.</p>
            ) : loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
            ) : (
                <div className="fade-in-up mx-auto max-w-2xl">
                    <div className="mb-8 flex items-end justify-center gap-3 sm:gap-4">
                        {top2 ? (
                            <div className="flex flex-col items-center">
                                <div className="mb-2 text-3xl sm:text-4xl">{avatars[1]}</div>
                                <div className="flex h-24 w-20 flex-col items-center justify-center rounded-t-2xl bg-linear-to-t from-slate-300 to-slate-200 shadow-inner sm:w-28">
                                    <span className="text-2xl">🥈</span>
                                    <span className="mt-1 text-xs font-bold text-slate-600">{top2.points_earned_total} pts</span>
                                </div>
                                <p className="mt-2 text-center text-xs font-semibold text-slate-700">{top2.user?.name || 'User'}</p>
                            </div>
                        ) : null}

                        {top1 ? (
                            <div className="flex flex-col items-center">
                                <div className="mb-2 text-4xl sm:text-5xl">{avatars[0]}</div>
                                <div className="relative flex h-32 w-24 flex-col items-center justify-center overflow-hidden rounded-t-2xl bg-linear-to-t from-amber-400 to-yellow-300 shadow-inner sm:w-32">
                                    <span className="relative text-3xl">🥇</span>
                                    <span className="relative mt-1 text-sm font-bold text-amber-900">{top1.points_earned_total} pts</span>
                                </div>
                                <p className="mt-2 text-sm font-bold text-slate-800">{top1.user?.name || 'User'}</p>
                            </div>
                        ) : null}

                        {top3 ? (
                            <div className="flex flex-col items-center">
                                <div className="mb-2 text-3xl sm:text-4xl">{avatars[2]}</div>
                                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-t-2xl bg-linear-to-t from-orange-300 to-amber-200 shadow-inner sm:w-28">
                                    <span className="text-2xl">🥉</span>
                                    <span className="mt-1 text-xs font-bold text-orange-700">{top3.points_earned_total} pts</span>
                                </div>
                                <p className="mt-2 text-center text-xs font-semibold text-slate-700">{top3.user?.name || 'User'}</p>
                            </div>
                        ) : null}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {leaderboard.map((row, i) => (
                            <div
                                key={row.user_id}
                                className={`flex items-center gap-4 px-5 py-4 transition ${i !== leaderboard.length - 1 ? 'border-b border-slate-100' : ''
                                    } ${i < 3 ? medalBgs[i] : 'hover:bg-slate-50'}`}
                            >
                                <div className="w-8 text-center">
                                    {i < 3 ? (
                                        <span className="text-xl">{medals[i]}</span>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                                    )}
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl shadow-sm">
                                    {avatars[i % avatars.length]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {row.user?.name || row.user?.email || 'Anonymous'}
                                    </p>
                                    <p className="text-xs text-slate-400">{row.is_me ? 'You' : 'Active member'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-indigo-600">{row.points_earned_total}</p>
                                    <p className="text-xs text-slate-400">points</p>
                                </div>
                            </div>
                        ))}
                        {!leaderboard.length ? <div className="px-5 py-8 text-center text-slate-400">No data yet</div> : null}
                    </div>
                </div>
            )}
        </div>
    )
}
